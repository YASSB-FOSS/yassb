import { setupYassb } from '@yassb/config/setup.function';
import { buildAll } from '@yassb/runners/build';
import { devServer, socketConnectionStore } from '@yassb/runners/server';
import { YassbConfig } from '@yassb/yassb';
import * as watcher from 'watch';

/**
 * Wrapper for the watch function. First starts the server and passes the listener as a callback function.
 */
export function watch(): void {
  const config = setupYassb();
  devServer(config, DoWatch);
}

/**
 * Actually listens to any change in the project folder and respawns the build process onchanges.
 * To speed up things excludes from the build provess assets that do not need to be changed.
 */
class DoWatch {
  /**
   * Determines if it's the first time we are running the watcher.
   */
  private firstRun = true;
  /**
   * Determines that we are in watch mode.
   */
  private isWatching = true;

  private timer: NodeJS.Timeout;
  private filesChanged: Array<any> = [];

  /**
   * Creates an instance of do watch.
   *
   * @param config full YASSB configuration object.
   */
  constructor(
    private config: YassbConfig
  ) { }

  /**
   * Inits do watch by first calling a full build process, and then initiating the watch function.
   * We first do a non-watched build process to ensure everything is running smoothly.
   * In a future update we could start directly with the watcher.
   */
  public async init(): Promise<void> {
    await buildAll({ isWatching: true });
    this.watch();
  }

  /**
   * Watchs the `src` folder as defined in the config object and runs the builder on changes.
   */
  private watch(): void {
    watcher.watchTree(this.config.workingDir.src, { interval: 1 }, this.onFilesChanged.bind(this));
  }

  private async onFilesChanged(file: any): Promise<void> {
    if (this.firstRun === true) {
      this.firstRun = false;
      return;
    }

    this.bufferFilesChanged(file);

    this.firstRun = false;
  };

  private bufferFilesChanged(file: any): void {
    this.filesChanged.push(file);
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.processFilesChanged();
      this.filesChanged = [];
    }, 500);
  }

  private processFilesChanged(): void {
    let runStyles = false;
    let runScripts = false;
    let skipTexts = false;

    this.filesChanged.forEach(file => {
      runStyles = this.shouldRunStyles(file) ? true : runStyles;
      runScripts = this.shouldRunScripts(file) ? true : runScripts;
      skipTexts = this.shouldSkipTexts(runScripts, runStyles) ? true : skipTexts;
    });

    this.sendStartRebuildMessage();

    buildAll({ runScripts, runStyles, skipTexts, isWatching: this.isWatching });

    this.sendReloadMessage();

  }

  /**
   * Sends to the browser via the WebSocket connection the message the the rebuild process has started.
   */
  private sendStartRebuildMessage(): void {
    if (!this.firstRun && socketConnectionStore.conn)
      socketConnectionStore.conn.send(JSON.stringify({ msg: 'Changes detected. Rebuilding...', type: 'start' }));
  }

  /**
   * Determins if the file changes is a stylesheet and if styles should run.
   *
   * @param file the file that has changed.
   * @returns true if the file changed is a stylesheet.
   */
  private shouldRunStyles(file: any): boolean {
    return (this.shouldDo('.scss', file) || this.shouldDo('.css', file)) ? true : false;
  }

  /**
   * Determins if the file changes is a script and if scripts should run.
   *
   * @param file the file that has changed.
   * @returns true if the file changed is a script.
   */
  private shouldRunScripts(file: any): boolean {
    return (
      this.shouldDo('.ts', file) || this.shouldDo('.js', file) ||
      this.shouldDo('.tsx', file) || this.shouldDo('.jsx', file)
    ) ? true : false;
  }

  /**
   * Determines if it is unnecessary to rebuild text files
   *
   * @param runScripts whether we need to run scripts.
   * @param runStyles whether we need to run styles.
   * @returns true if it's not the first run and we are rebuilding either scripts or styles.
   */
  private shouldSkipTexts(runScripts: boolean, runStyles: boolean): boolean {
    return (!this.firstRun && (runScripts || runStyles)) ? true : false;
  }

  /**
   * Sends a message to the browser via the WebSocket connection to reload the page at the end of the build process.
   */
  private sendReloadMessage(): void {
    if (!this.firstRun && socketConnectionStore.conn)
      socketConnectionStore.conn.send(JSON.stringify({ msg: 'Rebuild done. Reloading...', type: 'end' }));
  }

  /**
   * Determines if the changed file is of a given type to determine if we need to rebuild certain assets.
   *
   * @param extension extension that we are looking for.
   * @param fileName the file that has changed.
   * @returns true if the file that has changed has the extension that we are looking for.
   */
  // eslint-disable-next-line @typescript-eslint/tslint/config
  private shouldDo(extension: '.ts' | '.js' | '.tsx' | '.jsx' | '.scss' | '.css', fileName): boolean {
    switch (true) {
      case this.firstRun:
      case !fileName:
      case typeof fileName !== 'string':
      case fileName.endsWith(extension):
        return true;
      default:
        return false;
    }
  }
};
