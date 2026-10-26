import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';
import { WORKING_DIR } from '../config/working-dir.constant';
import { ListFiles } from '../tools/file-system-helpers/list-files.class';
import type { YassbConfig } from '../yassb';
import { PostProcessFile } from './post-process-file.class';

/**
 * Post-processes every HTML file of `out`, then deletes `sitemap.xml` if `siteHost` is not set (as 1.x did).
 */
export class PostProcessFiles {

  constructor(
    private config: YassbConfig,
    private isWatching: boolean,
    private liveReloadSnippet?: string
  ) { }

  public async do(): Promise<void> {
    const htmlFiles = new ListFiles(WORKING_DIR.out, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    for (const pathToFile of htmlFiles)
      await new PostProcessFile(pathToFile, this.config, this.isWatching, this.liveReloadSnippet).init();
    const sitemap = resolve(WORKING_DIR.out, 'sitemap.xml');
    if (!this.config.siteHost && this.config.sitemap !== false && existsSync(sitemap))
      rmSync(sitemap);
  }

}
