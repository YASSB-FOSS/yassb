import { ChildProcess, fork } from 'child_process';
import type { Server } from 'http';
import { dirname, extname, resolve, sep } from 'path';
import { performance } from 'perf_hooks';
import type { Diagnostic } from '../../diagnostics/diagnostics';
import type { SetupInfo } from '../../pipeline/build';
import { LOCK_OWNER_ENV, releaseOutputLock } from '../../pipeline/output-lock';
import { LiveReloadHub } from '../../server/live-reload';
import { startStaticServer } from '../../server/static-server';
import { ProjectWatcher } from '../../watch/project-watcher';
import type { ParsedArgs } from '../args';
import type { WorkerBuildRequest, WorkerResultMessage } from '../build-worker';

/**
 * `yassb watch`: builds the site, serves it with live reload, and rebuilds on every change.
 *
 * This process only watches files, serves pages and talks to the browser. Each build runs in a new child
 * process (`yassb __build`), so:
 * - changes to anything used by the build (config, renderers, directives, package.json, tsconfig…) are always
 *   picked up, because nothing is kept between builds;
 * - an exception in site code is shown in the terminal and in the browser, and the server keeps running.
 *
 * The process of the next build is started as soon as the previous build ends: it loads Node, the engine and the
 * site's packages while nothing is building, so a save only waits for the build itself. It is replaced if site
 * code, the configuration or a file outside the sources changes in the meantime.
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

/** A child process that runs one build. */
interface Worker {
  child: ChildProcess;
  /** The build in progress, if any. */
  current?: {
    plan: Plan;
    startedAt: number;
    stderrTail: string;
    result?: WorkerResultMessage;
    done: () => void;
  };
}

/**
 * @feature cli.watch
 * @summary yassb watch: build, serve with live reload, rebuild on every change.
 * @usage yassb watch [--port <n>] [--clean] [--strict]
 * @options --port <n>: dev server port (default devServerPort or 3000; 0 = any free port); --clean: empty the output before the first build; --strict: passed to every build.
 * @rules The whole project is watched except the output folder, node_modules, .git and editor temp files; every build runs in a fresh child process, so config, renderers, directives, package.json and tsconfig changes are always picked up; the process of the next build is started when a build ends and loads Node, the engine and the site's packages (by loading the configuration once) before the next change, and is replaced if site code, the configuration or a file outside src changes meanwhile; a stylesheet change only recompiles styles (CSS swapped without reload), a change to a file used only by the scripts only rebundles them, other changes rebuild pages (and styles with a custom stylesParser), changes outside src or to site code rebuild everything; errors are printed and shown in the browser overlay while the server keeps running; changes during a build are queued into one more build; pages are not minified.
 * @errors BUILD_CRASHED
 * @status stable
 * @since 1.0.0
 * @related behaviour.dev-server, behaviour.live-reload, behaviour.site-code
 */
export async function watchCommand(args: ParsedArgs): Promise<void> {
  await new WatchSession(args).start();
}

class WatchSession {

  private info: SetupInfo | undefined;
  private inputs = { scripts: new Set<string>(), styles: new Set<string>(), code: new Set<string>() };
  private liveReload = new LiveReloadHub();
  /** The process of the next build (started in advance), or of the build in progress. */
  private worker: Worker | undefined;
  /** The process started in advance may hold site code or packages that changed since. */
  private freshWorker = false;
  private stopping = false;
  private pending: Plan | undefined;
  private watcher: ProjectWatcher | undefined;
  private server: Server | undefined;
  private lastDiagnostics: Array<Diagnostic> = [];
  /** Output folders locked by this session (the configuration may change the folder). */
  private outputs = new Set<string>();

  constructor(private args: ParsedArgs) { }

  public async start(): Promise<void> {
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    await this.build(FULL, this.args.flags.clean === true);

    if (this.lastDiagnostics.some(item => item.code === 'OUTPUT_LOCKED')) {
      console.error('\n✗ Not starting: another YASSB process is writing the same output folder (see above).');
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
    console.log(`\nServing ${this.out()} on http://localhost:${actualPort}`);
    console.log('Watching for changes (Ctrl+C to stop)\n');

    this.watcher = new ProjectWatcher({
      roots: this.roots(),
      ignore: () => [this.out()],
      onChange: paths => this.onChange(paths)
    });
    this.watcher.start();
  }

  private out(): string {
    return this.info?.out || resolve(process.cwd(), 'dist/public');
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
    if (this.needsFreshWorker(paths))
      this.freshWorker = true;
    const names = paths.map(path => path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path);
    console.log(`\nChanged: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` (+${names.length - 5})` : ''}`);
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
    const plan: Plan = { html: false, styles: false, scripts: false };
    const appDir = this.info.src + sep;
    const stylesDir = dirname(this.info.stylesEntry) + sep;
    for (const path of paths) {
      if (this.inputs.code.has(path) || !path.startsWith(appDir) || this.info.configFiles.includes(path))
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
   * Site code, configuration and files outside the sources (package.json, tsconfig…) may change what the process
   * started in advance has loaded: the next build runs in a new one.
   */
  private needsFreshWorker(paths: Array<string>): boolean {
    if (!this.info)
      return true;
    const appDir = this.info.src + sep;
    return paths.some(path => this.inputs.code.has(path) || !path.startsWith(appDir) || this.info!.configFiles.includes(path));
  }

  /** Runs a build in the child process; changes arriving meanwhile are queued into one more build. */
  private build(plan: Plan, clean: boolean): Promise<void> {
    if (this.worker?.current) {
      this.pending = this.pending
        ? { html: this.pending.html || plan.html, styles: this.pending.styles || plan.styles, scripts: this.pending.scripts || plan.scripts }
        : plan;
      return Promise.resolve();
    }

    const steps = (Object.keys(plan) as Array<keyof Plan>).filter(step => plan[step]);
    if (!steps.length)
      return Promise.resolve();

    if (this.worker && this.freshWorker)
      this.stopWorker();
    const worker = this.worker || this.startWorker();

    this.liveReload.building();
    return new Promise(resolvePromise => {
      worker.current = { plan, startedAt: performance.now(), stderrTail: '', done: resolvePromise };
      const request: WorkerBuildRequest = { type: 'build', steps: plan, clean, strict: this.args.flags.strict === true };
      worker.child.send(request);
    });
  }

  private startWorker(): Worker {
    const cli = resolve(__dirname, '..', `cli${extname(__filename)}`);
    // Builds share the lock of the output folder held by this process.
    const child = fork(cli, ['__build'], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, [LOCK_OWNER_ENV]: String(process.pid) } });
    const worker: Worker = { child };
    this.worker = worker;
    this.freshWorker = false;
    // A send to a process that just exited: the 'exit' handler reports the build.
    child.on('error', () => undefined);
    child.stdout?.on('data', chunk => process.stdout.write(chunk));
    child.stderr?.on('data', chunk => {
      process.stderr.write(chunk);
      if (worker.current)
        worker.current.stderrTail = (worker.current.stderrTail + chunk.toString()).slice(-4000);
    });
    child.on('message', (message: { type: string; info?: SetupInfo }) => {
      if (message.type === 'setup' && message.info) {
        this.info = message.info;
        this.outputs.add(message.info.out);
      }
      if (message.type === 'result' && worker.current) {
        worker.current.result = message as unknown as WorkerResultMessage;
        this.finishBuild(worker, null);
      }
    });
    child.on('exit', code => {
      if (this.worker === worker)
        this.worker = undefined;
      // Exited during a build without a result: the build crashed (reported by onBuildFinished).
      if (worker.current)
        this.finishBuild(worker, code);
    });
    return worker;
  }

  private stopWorker(): void {
    const worker = this.worker;
    this.worker = undefined;
    if (worker) {
      worker.child.removeAllListeners('exit');
      worker.child.kill();
    }
  }

  private finishBuild(worker: Worker, code: number | null): void {
    const current = worker.current;
    if (!current)
      return;
    worker.current = undefined;
    // The process exits by itself after its build; the next build gets a new one, started now.
    if (this.worker === worker)
      this.worker = undefined;
    worker.child.removeAllListeners('exit');
    this.onBuildFinished(current.plan, current.result, code, current.stderrTail, performance.now() - current.startedAt);
    if (!this.stopping && !this.worker)
      this.startWorker();
    current.done();
    if (this.pending) {
      const next = this.pending;
      this.pending = undefined;
      void this.build(next, false);
    }
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
      console.error(`✗ Build crashed (exit code ${code}). The server keeps running; fix the problem and save again.`);
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
    const summary = `${Math.round(durationMs)} ms (${steps}) — ${errors} error(s), ${warnings} warning(s)`;
    console.log(errors ? `✗ Built with errors in ${summary}` : `✓ Built in ${summary}`);

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
    this.stopWorker();
    process.exit(0);
  }

}
