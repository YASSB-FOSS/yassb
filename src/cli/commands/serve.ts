import { ConfigLoadError, setupYassb } from '../../config/setup.function';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { LANGS } from '../../i18n/langs.constant';
import { startStaticServer } from '../../server/static-server';
import type { ParsedArgs } from '../args';

/**
 * `yassb serve [--port <n>]`: serves the output folder as it is, without building.
 */
export async function serveCommand(args: ParsedArgs): Promise<number> {
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
  console.log(`Serving ${out} on http://localhost:${port} (Ctrl+C to stop)`);
  return new Promise<number>(() => undefined);
}
