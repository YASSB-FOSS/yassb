import { describeError } from '../diagnostics/diagnostics';
import { BuildSteps, runBuild } from '../pipeline/build';
import { LIVE_RELOAD_SNIPPET } from '../server/live-reload';
import type { ParsedArgs } from './args';

/**
 * Child process of `yassb watch`: runs one build and reports to the parent over IPC, then exits.
 * Every build starts from a fresh process, so changes to the configuration, renderers and directives
 * are always picked up, and a crash in site code cannot take down the dev server.
 *
 * Messages: `{ type: 'setup', info }` once the configuration is loaded, then `{ type: 'result', … }`.
 *
 * @featurePart cli.watch
 */
export async function runBuildWorker(args: ParsedArgs): Promise<void> {
  const steps: BuildSteps = {};
  if (typeof args.flags.steps === 'string') {
    const list = args.flags.steps.split(',');
    steps.html = list.includes('html');
    steps.styles = list.includes('styles');
    steps.scripts = list.includes('scripts');
  }

  let message: WorkerResultMessage;
  try {
    const result = await runBuild({
      watchMode: true,
      steps,
      clean: args.flags.clean === true,
      strict: args.flags.strict === true,
      liveReloadSnippet: LIVE_RELOAD_SNIPPET,
      command: 'watch',
      onSetup: info => send({ type: 'setup', info })
    });
    message = { type: 'result', ok: result.ok, durationMs: result.durationMs, diagnostics: result.diagnostics, inputs: result.inputs };
  } catch (error) {
    const { message: text, detail } = describeError(error);
    message = { type: 'result', ok: false, durationMs: 0, diagnostics: [{ level: 'error', code: 'BUILD_CRASHED', fatal: true, message: text, detail }], inputs: { scripts: [], styles: [], code: [] } };
  }
  send(message, () => {
    if (process.connected)
      process.disconnect();
  });
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

function send(message: unknown, callback?: () => void): void {
  if (typeof process.send === 'function')
    process.send(message, undefined, {}, () => callback && callback());
  else if (callback)
    callback();
}
