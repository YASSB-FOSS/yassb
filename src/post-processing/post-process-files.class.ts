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
   */
  public do(): void {
    this.htmlFiles = new ListFiles(WORKING_DIR.out, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    this.htmlFiles.forEach(pathToFile => {
      new PostProcessFile(pathToFile, this.config, this.isWatching).init();
    });
    this.removeSiteMap();
  }

  /**
   * Removes sitemap.xml if no `siteHost` was set in the configuration.
   */
  private removeSiteMap(): void {
    if (!this.config.siteHost)
      removeSync(resolve(WORKING_DIR.out, 'sitemap.xml'));
  }

}
