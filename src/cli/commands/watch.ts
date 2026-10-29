import { ChildProcess, fork } from 'child_process';
import { rmSync } from 'fs';
import type { Server } from 'http';
import { basename, dirname, extname, join, resolve, sep } from 'path';
import { performance } from 'perf_hooks';
import type { Diagnostic } from '../../diagnostics/diagnostics';
import type { SetupInfo } from '../../pipeline/build';
import { LOCK_OWNER_ENV, releaseOutputLock } from '../../pipeline/output-lock';
import { LiveReloadHub } from '../../server/live-reload';
import { startStaticServer } from '../../server/static-server';
import { badges, c, COLOR, formatCounts, formatMs, glyph, printBanner, timestamp } from '../../tools/terminal';
import { ProjectWatcher } from '../../watch/project-watcher';
import { syncOutput } from '../../watch/sync-output';
import type { ParsedArgs } from '../args';
import type { WorkerBuildRequest, WorkerResultMessage } from '../build-worker';

/**
 * `yassb watch`: builds the site, serves it with live reload, and rebuilds on every change.
 *
 * This process only watches files, serves pages and talks to the browser. Builds run in child processes
 * (`yassb __build`), so an exception in site code is shown in the terminal and in the browser while the server
 * keeps running. A child process is started ahead of time, while nothing is building: it loads Node, the engine
 * and the site's packages, so a save only waits for the build itself.
 *
 * Fast, then verified. Packages in node_modules may keep state between builds (Tailwind keeps the class names it
 * has seen), so only a process that never built gives the same output as `yassb build`. Yet a process that already
 * built runs the code V8 has optimized, about a third faster. So:
 * - a content change (pages, data, translations, styles…) is built by the warm process, the one that built last,
 *   and the browser reloads at once;
 * - then a process that never built (started in advance) builds the same steps into a shadow folder (next to the
 *   output, so the browser never sees a half-written page); files that differ from the output are
 *   copied into it and the browser refreshes again (CSS swapped if only stylesheets differ);
 * - that process becomes the warm process: what a process carries over is at most one clean build;
 * - a change to site code, the configuration or a file outside the sources (package.json, tsconfig…) is built by a
 *   new process, so it is always picked up, and needs no verification;
 * - a change during a verification cancels it; its steps are verified with the next one.
 * `--fresh` runs every build in a new process, without warm builds or verification.
 *
 * Only what a change affects is rebuilt: a stylesheet change recompiles the styles (and swaps them in the
 * browser without reloading), a change to a file used only by the scripts bundles the scripts, anything else
 * rebuilds the pages.
 */

interface Plan {
  html: boolean;
  styles: boolean;
  scripts: boolean;
}

const FULL: Plan = { html: true, styles: true, scripts: true };
const NONE: Plan = { html: false, styles: false, scripts: false };

/** A child process that runs builds. */
interface Worker {
  child: ChildProcess;
  /** Value of `WatchSession.generation` when it started: an older process has loaded code that changed since. */
  generation: number;
  builds: number;
  /** What it built last: the output of a verification is not printed. */
  kind?: JobKind;
  /** The build in progress, if any. */
  current?: Job;
}

type JobKind = 'main' | 'verify';

interface Job {
  kind: JobKind;
  plan: Plan;
  startedAt: number;
  stderrTail: string;
  done: () => void;
}

/**
 * @feature cli.watch
 * @summary yassb watch: build, serve with live reload, rebuild on every change.
 * @usage yassb watch [--port <n>] [--clean] [--strict] [--fresh]
 * @options --port <n>: dev server port (default devServerPort or 3000; 0 = any free port); --clean: empty the output before the first build; --strict: passed to every build; --fresh: every build in a new process, without warm builds and verification.
 * @rules The whole project is watched except the output folder, node_modules, .git and editor temp files; events that do not change a file are ignored (its ctime is unchanged and not recent: Bun reports such events on the source of a copy); builds run in child processes started ahead of time (Node, the engine and the site's packages loaded before the next change), and every build loads the configuration and site code again; a change to site code, the configuration or a file outside src is built by a new process, so config, renderers, directives, package.json and tsconfig changes are always picked up; a content change is built by the warm process that built last (faster, reloads at once), then verified: a process that never built rebuilds the same steps into a shadow folder next to the output (.<out name>.yassb-verify, deleted when watch stops), files that differ are copied into the output and the browser refreshes again (CSS swapped if only stylesheets differ), and that process becomes the warm one; a change during a verification cancels it and its steps are verified with the next one; the afterBuild hook also runs for verification builds, with out set to the shadow folder; a stylesheet change only recompiles styles (CSS swapped without reload), a change to a file used only by the scripts only rebundles them, other changes rebuild pages (and styles with a custom stylesParser), changes outside src or to site code rebuild everything; errors are printed and shown in the browser overlay while the server keeps running; changes during a build are queued into one more build; pages are not minified.
 * @errors BUILD_CRASHED
 * @status stable
 * @since 1.0.0
 * @related behaviour.dev-server, behaviour.live-reload, behaviour.site-code
 */
export async function watchCommand(args: ParsedArgs): Promise<void> {
  printBanner('watch');
  await new WatchSession(args).start();
}

/**
 * `● ready  http://localhost:3000` and what the server does (watch and serve).
 *
 * @internal
 */
export function printReady(port: number, out: string, watching: boolean): void {
  const rel = out.startsWith(process.cwd()) ? out.slice(process.cwd().length + 1) || '.' : out;
  const tail = c.dim([' ', watching ? 'watching for changes' : 'no rebuilds', 'ctrl+c to stop'].join(' · ').slice(1));
  console.log(`\n  ${glyph.ready} ${c.bold('ready')}  ${c.underline(c.cyan(`http://localhost:${port}`))}\n           ${c.accent(rel)}${tail}\n`);
}

class WatchSession {

  private info: SetupInfo | undefined;
  private inputs = { scripts: new Set<string>(), styles: new Set<string>(), code: new Set<string>() };
  private liveReload = new LiveReloadHub();
  private fresh: boolean;
  /** Incremented when site code, the configuration or files outside the sources change. */
  private generation = 0;
  /** The process that built last, used for the next content change. */
  private keeper: Worker | undefined;
  /** A process started in advance that never built. */
  private spare: Worker | undefined;
  /** The process of the build in progress, if any. */
  private building: Worker | undefined;
  /** The process of the verification in progress, if any. */
  private verifier: Worker | undefined;
  /** Steps built by a process that had built before, not verified yet. */
  private unverified: Plan = { ...NONE };
  /** Steps built into the output since the shadow folder was last brought up to date. */
  private shadowBehind: Plan = { ...NONE };
  /** The shadow folder was fully built in this session (else the next verification is a clean full build). */
  private shadowReady = false;
  private stopping = false;
  private pending: Plan | undefined;
  private watcher: ProjectWatcher | undefined;
  private server: Server | undefined;
  private lastDiagnostics: Array<Diagnostic> = [];
  /** Output folders locked by this session (the configuration may change the folder). */
  private outputs = new Set<string>();

  constructor(private args: ParsedArgs) {
    this.fresh = args.flags.fresh === true;
  }

  public async start(): Promise<void> {
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    await this.build(FULL, this.args.flags.clean === true);

    if (this.lastDiagnostics.some(item => item.code === 'OUTPUT_LOCKED')) {
      console.error(`\n  ${badges.fail('FAIL')}  not starting: another YASSB process is writing the same output folder (see above)\n`);
      process.exit(1);
    }

    const requested = typeof this.args.flags.port === 'string' ? parseInt(this.args.flags.port, 10) : undefined;
    const port = requested ?? this.info?.devServerPort ?? 3000;
    const { server, port: actualPort } = await startStaticServer({
      port,
      liveReload: this.liveReload,
      site: () => ({ out: this.out(), langs: this.info?.langs || [] })
    });
    this.server = server;
    printReady(actualPort, this.out(), true);

    this.watcher = new ProjectWatcher({
      roots: this.roots(),
      ignore: () => [this.out(), this.shadowDir()],
      onChange: paths => this.onChange(paths)
    });
    this.watcher.start();
  }

  private out(): string {
    return this.info?.out || resolve(process.cwd(), 'dist/public');
  }

  /**
   * Where verification builds are written: next to the output folder, so that paths relative to it (source maps,
   * site code) are the same. Ignored by the watcher, deleted when watch stops.
   */
  private shadowDir(): string {
    const out = this.out();
    return join(dirname(out), `.${basename(out)}.yassb-verify`);
  }

  /** The project folder, plus the site's base folder when it is outside of it. */
  private roots(): Array<string> {
    const roots = [process.cwd()];
    const base = this.info?.base;
    if (base && !base.startsWith(process.cwd()))
      roots.push(base);
    return roots;
  }

  private onChange(paths: Array<string>): void {
    const plan = this.planFor(paths);
    if (this.changesCode(paths))
      this.generation++;
    const names = paths.map(path => path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path);
    const list = names.slice(0, 5).map(name => c.accent(name)).join(c.dim(', ')) + (names.length > 5 ? c.dim(` +${names.length - 5}`) : '');
    console.log(`\n${timestamp()} ${c.bold('change')} ${list}`);
    void this.build(plan, false);
  }

  /**
   * What a set of changed files requires:
   * - a file used only by the scripts → scripts;
   * - a stylesheet → styles;
   * - anything else in the sources → pages (and styles, when a custom stylesParser such as Tailwind scans them);
   * - site code or files outside the sources (config, package.json, tsconfig…) → everything.
   */
  private planFor(paths: Array<string>): Plan {
    if (!this.info)
      return { ...FULL };
    const plan: Plan = { ...NONE };
    const stylesDir = dirname(this.info.stylesEntry) + sep;
    for (const path of paths) {
      if (this.changesCode([path]))
        return { ...FULL };
      if (this.inputs.scripts.has(path)) {
        plan.scripts = true;
        continue;
      }
      if (this.inputs.styles.has(path) || (path.startsWith(stylesDir) && /\.(s?css|sass)$/.test(path))) {
        plan.styles = true;
        continue;
      }
      plan.html = true;
      if (this.info.hasCustomStylesParser)
        plan.styles = true;
    }
    return plan;
  }

  /**
   * Site code, configuration and files outside the sources (package.json, tsconfig…): a process that loaded
   * them before the change may not build any more.
   */
  private changesCode(paths: Array<string>): boolean {
    const info = this.info;
    if (!info)
      return true;
    const appDir = info.src + sep;
    return paths.some(path => this.inputs.code.has(path) || !path.startsWith(appDir) || info.configFiles.includes(path));
  }

  /** Runs a build; changes arriving meanwhile are queued into one more build. */
  private build(plan: Plan, clean: boolean): Promise<void> {
    if (this.building) {
      this.pending = this.pending ? union(this.pending, plan) : plan;
      return Promise.resolve();
    }
    if (isEmpty(plan))
      return Promise.resolve();

    // The new build replaces whatever the verification would have copied.
    this.cancelVerification();

    let worker: Worker;
    if (this.fresh)
      worker = this.takeSpare();
    else if (this.keeper && this.keeper.generation === this.generation)
      worker = this.keeper;
    else {
      this.discard(this.keeper);
      worker = this.keeper = this.takeSpare();
    }
    this.building = worker;

    this.liveReload.building();
    return new Promise(resolvePromise => {
      this.run(worker, { kind: 'main', plan, startedAt: performance.now(), stderrTail: '', done: resolvePromise }, { type: 'build', steps: plan, clean, strict: this.args.flags.strict === true });
    });
  }

  /** Rebuilds what warm builds wrote, in a process that never built, into the shadow folder. */
  private verify(): void {
    if (this.stopping || this.verifier || isEmpty(this.unverified))
      return;
    const shadow = this.shadowDir();
    const plan = this.shadowReady ? this.shadowBehind : { ...FULL };
    const worker = this.verifier = this.takeSpare();
    this.outputs.add(shadow);
    this.run(worker, { kind: 'verify', plan, startedAt: performance.now(), stderrTail: '', done: () => undefined }, { type: 'build', steps: plan, clean: !this.shadowReady, strict: this.args.flags.strict === true, outDir: shadow });
  }

  private run(worker: Worker, job: Job, request: WorkerBuildRequest): void {
    worker.current = job;
    worker.kind = job.kind;
    worker.builds++;
    worker.child.send(request);
  }

  private cancelVerification(): void {
    if (!this.verifier)
      return;
    // The shadow folder may be half written: its steps stay in shadowBehind, a full one stays not ready.
    this.discard(this.verifier);
    this.verifier = undefined;
  }

  /** A process started in advance that never built (a new one if there is none, or it loaded old code). */
  private takeSpare(): Worker {
    let worker = this.spare;
    this.spare = undefined;
    if (worker && worker.generation !== this.generation) {
      this.discard(worker);
      worker = undefined;
    }
    return worker || this.startWorker();
  }

  /** Starts the next process ahead of time, while nothing is building. */
  private prepareSpare(): void {
    if (this.stopping)
      return;
    if (this.spare && this.spare.generation !== this.generation) {
      this.discard(this.spare);
      this.spare = undefined;
    }
    if (!this.spare)
      this.spare = this.startWorker();
  }

  private startWorker(): Worker {
    const cli = resolve(__dirname, '..', `cli${extname(__filename)}`);
    // Builds share the lock of the output folder held by this process.
    // Its output is piped: it gets colours when this process has them.
    const colors = COLOR ? { FORCE_COLOR: '1' } : {};
    const child = fork(cli, ['__build'], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, ...colors, [LOCK_OWNER_ENV]: String(process.pid) } });
    const worker: Worker = { child, generation: this.generation, builds: 0 };
    // A send to a process that just exited: the 'exit' handler reports the build.
    child.on('error', () => undefined);
    child.stdout?.on('data', chunk => {
      if (worker.kind !== 'verify')
        process.stdout.write(chunk);
    });
    child.stderr?.on('data', chunk => {
      if (worker.kind !== 'verify')
        process.stderr.write(chunk);
      if (worker.current)
        worker.current.stderrTail = (worker.current.stderrTail + chunk.toString()).slice(-4000);
    });
    child.on('message', (message: { type: string; info?: SetupInfo }) => {
      if (message.type === 'setup' && message.info && worker.current?.kind === 'main') {
        this.info = message.info;
        this.outputs.add(message.info.out);
      }
      if (message.type === 'result' && worker.current)
        this.finishJob(worker, message as unknown as WorkerResultMessage, null);
    });
    child.on('exit', code => {
      this.forget(worker);
      // Exited during a build without a result: the build crashed.
      if (worker.current)
        this.finishJob(worker, undefined, code);
    });
    return worker;
  }

  /** Stops a process that is no longer needed. */
  private discard(worker: Worker | undefined): void {
    if (!worker)
      return;
    this.forget(worker);
    worker.current = undefined;
    worker.child.removeAllListeners('exit');
    worker.child.removeAllListeners('message');
    worker.child.kill();
  }

  private forget(worker: Worker): void {
    if (this.keeper === worker)
      this.keeper = undefined;
    if (this.spare === worker)
      this.spare = undefined;
  }

  private finishJob(worker: Worker, result: WorkerResultMessage | undefined, code: number | null): void {
    const job = worker.current;
    if (!job)
      return;
    worker.current = undefined;
    if (job.kind === 'main')
      this.finishBuild(worker, job, result, code);
    else
      this.finishVerification(worker, job, result, code);
  }

  private finishBuild(worker: Worker, job: Job, result: WorkerResultMessage | undefined, code: number | null): void {
    this.building = undefined;
    this.onBuildFinished(job.plan, result, code, job.stderrTail, performance.now() - job.startedAt);
    if (result) {
      this.shadowBehind = union(this.shadowBehind, job.plan);
      // A process that never built writes what `yassb build` would; one that built before must be verified.
      this.unverified = worker.builds > 1 ? union(this.unverified, job.plan) : minus(this.unverified, job.plan);
    }
    if (this.fresh || !result)
      this.discard(worker);
    this.prepareSpare();
    job.done();
    if (this.pending) {
      const next = this.pending;
      this.pending = undefined;
      void this.build(next, false);
    } else if (!this.fresh)
      this.verify();
  }

  private finishVerification(worker: Worker, job: Job, result: WorkerResultMessage | undefined, code: number | null): void {
    this.verifier = undefined;
    const durationMs = Math.round(performance.now() - job.startedAt);
    if (!result) {
      this.shadowReady = false;
      this.discard(worker);
      console.error(`${timestamp()} ${glyph.fail} ${c.red(`verification crashed (exit code ${code})`)} ${c.dim('the next one rebuilds everything')}${job.stderrTail ? `\n${job.stderrTail}` : ''}`);
      this.prepareSpare();
      return;
    }

    let changed: Array<string> = [];
    try {
      changed = syncOutput(this.shadowDir(), this.out());
    } catch (error) {
      console.error(`${timestamp()} ${glyph.fail} ${c.red('could not copy the verified files:')} ${(error as Error).message}`);
    }
    this.shadowReady = true;
    this.shadowBehind = { ...NONE };
    this.unverified = { ...NONE };

    if (changed.length) {
      const names = changed.slice(0, 3).map(name => c.accent(name)).join(c.dim(', ')) + (changed.length > 3 ? c.dim(` +${changed.length - 3}`) : '');
      console.log(`${timestamp()} ${glyph.sync} verified in ${c.bold(formatMs(durationMs))} ${c.dim('·')} ${changed.length} file${changed.length === 1 ? '' : 's'} differed from the warm build, updated: ${names}`);
    } else
      console.log(`${timestamp()} ${glyph.ok} verified in ${c.bold(formatMs(durationMs))} ${c.dim('· same output as yassb build')}`);
    this.lastDiagnostics = result.diagnostics;
    const refresh = !changed.length ? 'none' : changed.every(file => file.endsWith('.css')) ? 'css' : 'reload';
    this.liveReload.publish(result.diagnostics, refresh);

    // It built what `yassb build` would: it becomes the warm process.
    if (worker.generation === this.generation) {
      this.discard(this.keeper);
      this.keeper = worker;
    } else
      this.discard(worker);
    this.prepareSpare();
  }

  private onBuildFinished(plan: Plan, result: WorkerResultMessage | undefined, code: number | null, stderrTail: string, durationMs: number): void {
    if (!result) {
      this.lastDiagnostics = [{
        level: 'error',
        code: 'BUILD_CRASHED',
        fatal: true,
        message: `The build process exited unexpectedly (code ${code}).`,
        detail: stderrTail
      }];
      console.error(`${timestamp()} ${badges.fail('CRASH')} ${c.red(`build process exited (code ${code})`)} ${c.dim('· the server keeps running; fix the problem and save again')}`);
      this.liveReload.publish(this.lastDiagnostics, 'none');
      return;
    }

    for (const key of ['scripts', 'styles'] as const)
      if (plan[key])
        this.inputs[key] = new Set(result.inputs[key]);
    if (plan.html || result.inputs.code.length)
      this.inputs.code = new Set(result.inputs.code);

    this.lastDiagnostics = result.diagnostics;
    const errors = result.diagnostics.filter(item => item.level === 'error').length;
    const warnings = result.diagnostics.filter(item => item.level === 'warning').length;
    const steps = (Object.keys(plan) as Array<keyof Plan>).filter(step => plan[step]).join(', ');
    const summary = `built in ${c.bold(formatMs(durationMs))} ${c.dim(`(${steps})`)}  ${formatCounts({ errors, warnings })}`;
    console.log(`${timestamp()} ${errors ? glyph.fail : glyph.ok} ${summary}`);

    const configFailed = result.diagnostics.some(item => item.code === 'CONFIG_LOAD_FAILED' || item.code === 'CONFIG_MODULE_NOT_FOUND');
    const refresh = configFailed ? 'none' : (plan.html || plan.scripts ? 'reload' : 'css');
    this.liveReload.publish(result.diagnostics, refresh);
  }

  private stop(): void {
    this.stopping = true;
    for (const out of this.outputs)
      releaseOutputLock(out, process.pid);
    this.watcher?.close();
    this.liveReload.close();
    this.server?.close();
    for (const worker of [this.building, this.verifier, this.keeper, this.spare])
      this.discard(worker);
    try {
      rmSync(this.shadowDir(), { recursive: true, force: true });
    } catch {
      // left for the next session, which rebuilds it from scratch
    }
    process.exit(0);
  }

}

function union(a: Plan, b: Plan): Plan {
  return { html: a.html || b.html, styles: a.styles || b.styles, scripts: a.scripts || b.scripts };
}

function minus(a: Plan, b: Plan): Plan {
  return { html: a.html && !b.html, styles: a.styles && !b.styles, scripts: a.scripts && !b.scripts };
}

function isEmpty(plan: Plan): boolean {
  return !plan.html && !plan.styles && !plan.scripts;
}
