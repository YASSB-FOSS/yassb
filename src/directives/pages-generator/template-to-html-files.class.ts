import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, parse, relative, resolve } from 'path';
import { SupportedDirectives } from '../../config/supported-directives.const';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { report } from '../../diagnostics/diagnostics';
import { lineOf } from '../../diagnostics/diagnostics';
import { ListFiles, isDirectory } from '../../tools/file-system-helpers/list-files.class';
import { getDirectiveValues } from '../../tools/files-content-helpers/get-directive-value.function';
import { TextFormatterParser } from '../../tools/files-content-helpers/text-formatter-parser.class';
import { FrontMatterHandler } from '../../tools/front-matter/front-matter-handler.class';
import { FrontMatterInjector } from '../../tools/front-matter/front-matter-injector.class';
import { mdTitleExtractor } from '../../tools/md-title-extractor.function';
import { camelToKebabCase } from '../../tools/strings-formatters/camel-to-kebab-case.function';
import type { YassbConfig } from '../../yassb';
import { extractDirectives, replaceFirstLiteral } from '../tools/extract-directives.function';
import { GENERATED_PAGES } from './generated-pages.store';

/**
 * One template of `pages-to-generate` → one page per `.md`/`.txt` file of the folder in its
 * `<!-- generate-from-files="folder" -->` directive (relative to `workingDir.posts`, i.e. `src/app`).
 *
 * Output: `out/<template folder>/<file's subfolder>/<slug>.html`, where the slug is the front matter `slug`,
 * else the title (front matter `title`, else the first `# Title`), else the file name.
 * Front matter placeholders (`{ title }`) are replaced right away and again at the end of the build.
 */
export class TemplateToHtmlFiles {

  public static regex = /<!--\s*generate-from-files\s*=\s*".+"\s*-->/g;

  private directiveFullString: string;
  private dirSourcePath: string;
  private templateContents: string;

  constructor(
    private pathToTemplate: string,
    private configOptions: YassbConfig
  ) { }

  public init(): void {
    this.templateContents = readFileSync(this.pathToTemplate, 'utf8');
    const found = extractDirectives(this.templateContents, TemplateToHtmlFiles.regex);
    if (Array.isArray(found))
      this.directiveFullString = found[0];

    if (!this.directiveFullString) {
      report({
        level: 'error',
        code: 'TEMPLATE_NO_DIRECTIVE',
        file: this.pathToTemplate,
        message: `No \`generate-from-files\` directive in template ${this.pathToTemplate}. Template skipped.`,
        hint: 'The directive must be written in the template itself, not in a component.'
      });
      return;
    }

    const directiveData = getDirectiveValues(this.directiveFullString, this.configOptions, SupportedDirectives['generate-from-files'], 'posts');
    if (!directiveData)
      return;
    this.dirSourcePath = directiveData.fullPath;

    if (!isDirectory(this.dirSourcePath)) {
      report({
        level: 'error',
        code: 'TEMPLATE_SOURCE_NOT_FOUND',
        fatal: true,
        file: this.pathToTemplate,
        line: lineOf(this.pathToTemplate, this.directiveFullString),
        directive: this.directiveFullString,
        message: `Folder "${directiveData.directiveMainValue}" of \`${this.directiveFullString}\` not found (${this.dirSourcePath}).`,
        hint: 'The folder is relative to src/app (or workingDir.posts).'
      });
      return;
    }

    new ListFiles(this.dirSourcePath, file => file.endsWith('.md') || file.endsWith('.txt')).init()
      .forEach(path => this.createNewPageFromFile(path));
  }

  private createNewPageFromFile(pathToFile: string): void {
    const { content, data } = new TextFormatterParser(pathToFile, this.configOptions).do();
    const newFileHtmlContents = replaceFirstLiteral(this.templateContents, this.directiveFullString, content);

    const fileName = this.buildNewFileName(content, data, pathToFile);
    const pathOut = this.buildOutPath(pathToFile);
    mkdirSync(pathOut, { recursive: true });
    const fullPath = resolve(pathOut, fileName);
    FrontMatterHandler.set(fullPath, data);
    GENERATED_PAGES.set(fullPath, { template: this.pathToTemplate, source: pathToFile });
    writeFileSync(fullPath, new FrontMatterInjector(newFileHtmlContents, FrontMatterHandler.get(fullPath) || {}, pathToFile).inject());
  }

  private buildNewFileName(content: string, data: { [key: string]: any }, pathToFile: string): string {
    if (data.slug)
      return `${data.slug}.html`;
    const mdTitle = data.title ? data.title : mdTitleExtractor(content);
    const extension = extname(pathToFile);
    const fileNameDirty = mdTitle ? mdTitle : basename(pathToFile).replace(extension, '');
    return `${camelToKebabCase(String(fileNameDirty))}.html`;
  }

  private buildOutPath(pathToFile: string): string {
    const relativePathToTemplate = parse(relative(WORKING_DIR.pagesToGenerate, this.pathToTemplate)).dir;
    const relativePathToMd = parse(relative(this.dirSourcePath, pathToFile)).dir;
    return resolve(WORKING_DIR.out, relativePathToTemplate, relativePathToMd);
  }

}
