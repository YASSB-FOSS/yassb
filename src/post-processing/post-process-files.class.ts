import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { PostProcessFile } from '@yassb/post-processing/post-process-file.class';
import { ListFiles } from '@yassb/tools/file-system-helpers/list-files.class';
import { YassbConfig } from '@yassb/yassb';
import { removeSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Performs all actions to be carried on files after all directives have been executed..
 */
export class PostProcessFiles {

  /**
   * To speed up things post processing is async.
   * All promises are stored and returned in an Array to wait with `Promise.all`.
   */
  private arrPromises: Array<Promise<void>> = [];
  /**
   * List of files to post process.
   */
  private htmlFiles: Array<string> = [];

  /**
   * Creates an instance of post process files.
   *
   * @param config the full YASSB configuration file.
   * @param isWatching determines if we are in watch mode to skip unnecessary jobs meant for productions.
   */
  constructor(
    private config: YassbConfig,
    private isWatching: boolean
  ) { }

  /**
   * Do post process files by creating the list of file with `ListFiles` and then delegating the actions for each file to `PostProcessFile`.
   * All promises returned by `PostProcessFile` are pushed to an Array and returned so the calling process can wait if necessary.
   *
   * @returns all the promises in an Array.
   */
  public do(): Promise<Array<void>> {
    this.htmlFiles = new ListFiles(WORKING_DIR.out, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    this.htmlFiles.forEach(pathToFile => {
      this.arrPromises.push(new PostProcessFile(pathToFile, this.config, this.isWatching).init());
    });
    this.removeSiteMap();
    return Promise.all(this.arrPromises);
  }

  /**
   * Removes sitemap.xml if no `siteHost` was set in the configuration.
   */
  private removeSiteMap(): void {
    if (!this.config.siteHost)
      removeSync(resolve(WORKING_DIR.out, 'sitemap.xml'));
  }

}
