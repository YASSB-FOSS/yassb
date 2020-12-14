import { setupYassb } from '@yassb/config/setup.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { buildAll } from '@yassb/runners/build';
import { devServer, socketConnectionStore } from '@yassb/runners/server';
import * as watcher from 'watch';

/**
 * Wrapper for the watch function. First starts the server and passes the listener as a callback function.
 */
export function watch(): void {
  const config = setupYassb();
  devServer(config, doWatch);
}

/**
 * Actually listens to any change in the project folder and respawns the build process onchanges.
 * To speed up things excludes from the build provess assets that do not need to be changed.
 */
const doWatch = (): void => {

  let firstRun = true;
  const isWatching = true;

  watcher.watchTree(WORKING_DIR.src, { interval: 1 }, async (file, curr, prev) => {
    if (!firstRun && socketConnectionStore.conn)
      socketConnectionStore.conn.send(JSON.stringify({ msg: 'Changes detected. Rebuilding...', type: 'start' }));

    const runStyles = (shouldDo('.scss', file) || shouldDo('.css', file)) ? true : false;
    const runScripts = (
      shouldDo('.ts', file) || shouldDo('.js', file) ||
      shouldDo('.tsx', file) || shouldDo('.jsx', file)
    ) ? true : false;

    const skipTexts = (!firstRun && (runScripts || runStyles)) ? true : false;

    await buildAll({ runScripts, runStyles, skipTexts, isWatching });

    if (!firstRun && socketConnectionStore.conn)
      socketConnectionStore.conn.send(JSON.stringify({ msg: 'Rebuild done. Reloading...', type: 'end' }));

    firstRun = false;
  });

  // eslint-disable-next-line @typescript-eslint/tslint/config
  function shouldDo(extension: '.ts' | '.js' | '.tsx' | '.jsx' | '.scss' | '.css', fileName): boolean {
    switch (true) {
      case firstRun:
      case !fileName:
      case typeof fileName !== 'string':
      case fileName.endsWith(extension):
        return true;
      default:
        return false;
    }
  }
};
