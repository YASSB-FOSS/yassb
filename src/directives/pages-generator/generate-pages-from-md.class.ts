import { WORKING_DIR } from '../../config/working-dir.constant';
import { ListFiles } from '../../tools/file-system-helpers/list-files.class';
import type { YassbConfig } from '../../yassb';
import { TemplateToHtmlFiles } from './template-to-html-files.class';

/**
 * Generates pages from Markdown/text files: for every template in `pages-to-generate`, one page per file of the
 * folder named in its `generate-from-files` directive. Runs before the pages are processed, so generated pages
 * then go through all the other directives.
 */
export class GeneratePagesFromMd {

  constructor(
    private configOptions: YassbConfig
  ) { }

  public make(): void {
    const templates = new ListFiles(WORKING_DIR.pagesToGenerate, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    templates.forEach(pathToHtmlTemplate => new TemplateToHtmlFiles(pathToHtmlTemplate, this.configOptions).init());
  }

}
