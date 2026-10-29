import { loadConfig } from '../config/load-config';
import { forgetSiteModules } from '../config/setup.function';
import { describeError } from '../diagnostics/diagnostics';
import { BuildSteps, runBuild } from '../pipeline/build';
import { LIVE_RELOAD_SNIPPET } from '../server/live-reload';
import type { ParsedArgs } from './args';

/**
 * Child process of `yassb watch` (`yassb __build`): runs one build and reports to the parent over IPC, then exits.
 *
 * Every build runs in a new process, so changes to the configuration, renderers and directives are always picked
 * up, nothing is kept from a previous build, and a crash in site code cannot take down the dev server. The parent
 * starts the process ahead of time, while nothing is building: it loads the configuration once, so that Node, the
 * engine and the site's packages (node_modules) are ready, then forgets the site modules. The build loads the
 * configuration and site code again, so content read by site code is always current.
 *
 * Messages from the parent: `{ type: 'build', steps, clean, strict }`.
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

  let finished = false;
  // The parent stopped before the build (e.g. it replaced this process): nothing to finish.
  process.on('disconnect', () => {
    if (!finished)
      process.exit(0);
  });
  process.once('message', async (request: WorkerBuildRequest) => {
    if (request && request.type === 'build')
      await send(await build(request));
    // Exits once its output is written (no process.exit: pipes are asynchronous on macOS).
    finished = true;
    if (process.connected)
      process.disconnect();
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
