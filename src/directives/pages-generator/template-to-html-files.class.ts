import { SupportedDirectives } from '@yassb/config/supported-directives.const';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { extractDirectives } from '@yassb/directives/tools/extract-directives.function';
import { PostProcessFile } from '@yassb/post-processing/post-process-file.class';
import { ListFiles } from '@yassb/tools/file-system-helpers/list-files.class';
import { getDirectiveValues } from '@yassb/tools/files-content-helpers/get-directive-value.function';
import { TextFormatterParser } from '@yassb/tools/files-content-helpers/text-formatter-parser.class';
import { FrontMatterHandler } from '@yassb/tools/front-matter/front-matter-handler.class';
import { mdTitleExtractor } from '@yassb/tools/md-title-extractor.function';
import { camelToKebabCase } from '@yassb/tools/strings-formatters/camel-to-kebab-case.function';
import { YassbConfig } from '@yassb/yassb';
import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { GrayMatterFile } from 'gray-matter';
import {
  basename,
  extname,
  parse,
  relative,
  resolve
  } from 'path';

/**
 * Takes care of actually injecting in the template the content from a given file and saves to disk the resulting page.
 */
export class TemplateToHtmlFiles {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /<!--\s*generate-from-files\s*=\s*".+"\s*-->/g;

  /**
   * Full string of the directive in the template body to determine the source folder.
   */
  private directiveFullString: string;
  /**
   * Dir where to look for source files.
   */
  private dirSourcePath: string;
  /**
   * Contents of the templte before content is injected.
   */
  private templateContents: string;

  /**
   * List of paths to all the cupported files found at `dirSourcePath`, including subdirectories.
   */
  private supportedFilesPaths: Array<string> = [];

  /**
   * Creates an instance of template to html files.
   *
   * @param pathToTemplate the full absolute path to the template
   * @param configOptions the full YASSB config Object
   */
  constructor(
    private pathToTemplate: string,
    private configOptions: YassbConfig
  ) { }

  /**
   * Inits template to html files.
   * The operation is aborted if no directive is found in the template or no file is found in the `dirSourcePath`.
   * Else, for each file found a new page is generated based on the template with the contents of the file.
   *
   * @returns init
   */
  public init(): void {
    this.templateContents = readFileSync(this.pathToTemplate, 'utf8');
    this.extractComponents(this.templateContents);

    if (!this.directiveFullString) {
      console.error(`ERROR: no directive \`generate-from-files\` found in template ${this.pathToTemplate}. Template skipped.`);
      return;
    }

    this.setDirSourcePath();

    if (!this.dirSourcePath)
      return;

    this.supportedFilesPaths = new ListFiles(this.dirSourcePath, file => file.endsWith('.md') || file.endsWith('.txt')).init();
    this.supportedFilesPaths.forEach(path => this.createNewPageFromFile(path));
  }

  /**
   * Extracts from the template the YASSB formatted comment with the directive `generate-from-files` pointing to the dir to scan for .md files
   *
   * @param text The full text of the template
   */
  private extractComponents(text: string): void {
    const arrComponents = extractDirectives(text, TemplateToHtmlFiles.regex);
    if (Array.isArray(arrComponents))
      this.directiveFullString = arrComponents[0];
  }

  /**
   * Removes the text of the YASSB formatted comment
   */
  private setDirSourcePath(): void {
    const directiveData = getDirectiveValues(this.directiveFullString, this.configOptions, SupportedDirectives['generate-from-files'], 'posts');
    if (!directiveData)
      return;
    this.dirSourcePath = directiveData.fullPath;
  }

  /**
   * Creates a new page from the source file
   *
   * @param pathToFile
   */
  private createNewPageFromFile(pathToFile: string): void {

    const { content, data } = new TextFormatterParser(pathToFile).do();
    const newFileHtmlContents = this.templateContents.replace(this.directiveFullString, content);

    const fileName = this.buildNewFileName(content, data, pathToFile);
    const pathOut = this.buildOutPath(pathToFile);
    ensureDirSync(pathOut);
    const fullPath = resolve(pathOut, fileName);
    FrontMatterHandler.set(fullPath, data);
    writeFileSync(fullPath, newFileHtmlContents);
    new PostProcessFile(fullPath, this.configOptions, false, false).init();
  }

  /**
   * Builds the file name for the file. If in Front Matter a slug is provided, that is preferred. If not, a slug is generated from the title in Front Matter.
   * If no title is found in Front Matter, the title is extracted from the file. If not tile has been found, it falls back to the filename of the data source file.
   *
   * @param content content of the generated page.
   * @param grayMatterData Object with the content and the Front Matter data as parsed by `gray-matter`.
   * @param pathToFile the full path to the file bein processed.
   * @returns new file name .
   */
  private buildNewFileName(content: string, data: GrayMatterFile<string>['data'], pathToFile: string): string {
    if (data.slug)
      return `${data.slug}.html`;
    const mdTitle = data.title ? data.title : mdTitleExtractor(content);
    const extension = extname(pathToFile);
    const fileNameDirty = mdTitle ? mdTitle : basename(pathToFile).replace(extension, '');
    const fileNameClean = camelToKebabCase(fileNameDirty);
    return `${fileNameClean}.html`;
  }

  /**
   * Determines where to save the new file by combining the relative path of the template and of the source file.
   *
   * @param pathToFile full absolute path to the source file
   * @returns out path
   */
  private buildOutPath(pathToFile: string): string {
    const relativePathToTemplateWithFileName = relative(WORKING_DIR.pagesToGenerate, this.pathToTemplate);
    const relativePathToTemplate = parse(relativePathToTemplateWithFileName).dir;

    const relativePathToMdWithFilename = relative(this.dirSourcePath, pathToFile);
    const relativePathToMd = parse(relativePathToMdWithFilename).dir;

    return resolve(WORKING_DIR.out, relativePathToTemplate, relativePathToMd);
  }

}
