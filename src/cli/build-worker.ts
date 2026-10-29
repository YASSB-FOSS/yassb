import { loadConfig } from '../config/load-config';
import { forgetSiteModules } from '../config/setup.function';
import { describeError } from '../diagnostics/diagnostics';
import { BuildSteps, runBuild } from '../pipeline/build';
import { LIVE_RELOAD_SNIPPET } from '../server/live-reload';
import type { ParsedArgs } from './args';

/**
 * Child process of `yassb watch` (`yassb __build`): runs builds requested by the parent over IPC.
 *
 * The parent starts it ahead of time, while nothing is building: it loads the configuration once, so that Node,
 * the engine and the site's packages (node_modules) are ready, then forgets the site modules. Every build loads
 * the configuration and the site code again, so content read by site code is always current. Packages in
 * node_modules stay loaded between builds, with whatever state they keep: the parent decides when a process may
 * build again and verifies those builds (see `watch`).
 *
 * Messages from the parent: `{ type: 'build', steps, clean, strict, outDir? }`.
 * Messages to the parent: `{ type: 'setup', info }` once the configuration is loaded, then `{ type: 'result', … }`.
 *
 * Without an IPC channel (run by hand, e.g. for profiling) it runs one build from the flags.
 *
 * @featurePart cli.watch
 */
export async function runBuildWorker(args: ParsedArgs): Promise<void> {
  if (typeof process.send !== 'function') {
    await build({ steps: stepsFromFlag(args.flags.steps), clean: args.flags.clean === true, strict: args.flags.strict === true });
    return;
  }

  // The parent stopped or replaced this process.
  process.on('disconnect', () => process.exit(0));
  let queue = Promise.resolve();
  process.on('message', (request: WorkerBuildRequest) => {
    if (!request || request.type !== 'build')
      return;
    queue = queue.then(async () => {
      forgetSiteModules();
      await send(await build(request));
    });
  });
  warmUp();
}

/**
 * Loads the configuration without building, so that the packages it imports are loaded, then forgets the site
 * modules. Problems are ignored here: the build loads the configuration again and reports them.
 */
function warmUp(): void {
  try {
    loadConfig(process.cwd());
  } catch {
    // reported by the build
  }
  forgetSiteModules();
}

/**
 * @featurePart cli.watch
 */
export interface WorkerBuildRequest {
  type: 'build';
  steps: BuildSteps;
  clean: boolean;
  strict: boolean;
  /** Build into this folder instead of the configured output (verification builds). */
  outDir?: string;
  /** With `outDir`: the folder paths in the output are computed against (the configured output). */
  referenceOutDir?: string;
}

/**
 * @featurePart cli.watch
 */
export interface WorkerResultMessage {
  type: 'result';
  ok: boolean;
  durationMs: number;
  diagnostics: Array<import('../diagnostics/diagnostics').Diagnostic>;
  inputs: { scripts: Array<string>; styles: Array<string>; code: Array<string> };
}

async function build(request: Omit<WorkerBuildRequest, 'type'>): Promise<WorkerResultMessage> {
  try {
    const result = await runBuild({
      watchMode: true,
      steps: request.steps,
      clean: request.clean,
      strict: request.strict,
      outDir: request.outDir,
      referenceOutDir: request.referenceOutDir,
      liveReloadSnippet: LIVE_RELOAD_SNIPPET,
      command: 'watch',
      onSetup: info => void send({ type: 'setup', info })
    });
    return { type: 'result', ok: result.ok, durationMs: result.durationMs, diagnostics: result.diagnostics, inputs: result.inputs };
  } catch (error) {
    const { message: text, detail } = describeError(error);
    return { type: 'result', ok: false, durationMs: 0, diagnostics: [{ level: 'error', code: 'BUILD_CRASHED', fatal: true, message: text, detail }], inputs: { scripts: [], styles: [], code: [] } };
  }
}

function stepsFromFlag(flag: unknown): BuildSteps {
  if (typeof flag !== 'string')
    return {};
  const list = flag.split(',');
  return { html: list.includes('html'), styles: list.includes('styles'), scripts: list.includes('scripts') };
}

function send(message: unknown): Promise<void> {
  return new Promise(resolvePromise => {
    if (typeof process.send === 'function' && process.connected)
      process.send(message, undefined, {}, () => resolvePromise());
    else
      resolvePromise();
  });
}
