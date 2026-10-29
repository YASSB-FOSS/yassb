import { ConfigLoadError, setupYassb } from '../../config/setup.function';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { LANGS } from '../../i18n/langs.constant';
import { startStaticServer } from '../../server/static-server';
import { printBanner } from '../../tools/terminal';
import type { ParsedArgs } from '../args';
import { printReady } from './watch';

/**
 * `yassb serve [--port <n>]`: serves the output folder as it is, without building.
 *
 * @feature cli.serve
 * @summary yassb serve: serves the output folder without building.
 * @usage yassb serve [--port <n>]
 * @options --port <n>: port (default devServerPort or 3000).
 * @rules Uses the same routing as watch, without live reload; loads the configuration only to find the output folder and languages.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related behaviour.dev-server
 */
export async function serveCommand(args: ParsedArgs): Promise<number> {
  printBanner('serve');
  let devServerPort: number | undefined;
  try {
    devServerPort = setupYassb({ createDirs: false }).config.devServerPort;
  } catch (error) {
    if (error instanceof ConfigLoadError)
      return 1;
    throw error;
  }
  const requested = typeof args.flags.port === 'string' ? parseInt(args.flags.port, 10) : undefined;
  const out = WORKING_DIR.out;
  const langs = [...LANGS];
  const { port } = await startStaticServer({ port: requested ?? devServerPort ?? 3000, site: () => ({ out, langs }) });
  printReady(port, out, false);
  return new Promise<number>(() => undefined);
}
