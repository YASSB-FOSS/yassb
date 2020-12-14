import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { DirectivesParser } from '@yassb/directives/directives-parser.class';
import { Translator } from '@yassb/i18n/static-i18n/lib';
import { ListFiles } from '@yassb/tools/file-system-helpers/list-files.class';
import { FrontMatterHandler } from '@yassb/tools/front-matter/front-matter-handler.class';
import { YassbConfig } from '@yassb/yassb';
import { readFileSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Entry point for executing all directives other than `generate-from-files`.
 * If i18n is enabled it gets called for each language.
 */
export class FilesContentInjector {

  /**
   * List of all files for content injection
   */
  private htmlFiles: Array<string> = [];

  /**
   * Instance of `Translator` to translate file contents
   */
  private translator: Translator;

  /**
   * Creates an instance of files content injector.
   */
  constructor(
    private config: YassbConfig
  ) { }

  /**
   * Retrieves the list of files to process with `ListFiles` and loops them with `forEach`.
   * The source files are taken from the `out` folder where they have been copied to by `copyPages` or have been created there by `generate-from-files`
   * Determines the destination folder in which the processed file should be copied to.
   *
   * @param [lang] if a language is passed the folder where to look for files to process resolves to the folder for the lang .
   */
  public make(lang?: string): void {
    if (lang)
      this.setTranslator(lang);
    const dest = lang ? resolve(WORKING_DIR.out, lang) : WORKING_DIR.out;
    this.htmlFiles = new ListFiles(dest, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    this.htmlFiles.forEach(file => this.processFile(file, lang));
  }

  /**
   * Initiates a new instance of `Translator` to translate file contents.
   *
   * @param lang the current language being processed.
   */
  private setTranslator(lang: string): void {
    this.translator = new Translator({ localesPath: WORKING_DIR.i18n }, lang);
  }

  /**
   * Process each file found in the `out` dir.
   * For each file delegates the processing of directives to `DirectivesParser`.
   * From `DirectivesParser` receives the complete content of the file and the Front Matter data.
   * The Front Matter data is added to the top of the file as a string for later use in post processing.
   * If i18n is enabled the translation is carried out.
   * Finally the existing file in `out` is overwritten with the new contents.
   *
   * @param file the full path on disk to the file being processed.
   * @param lang the language being processed if i18n is enabled.
   */
  private processFile(file: string, lang: string): void {
    let fileContents = new DirectivesParser(file, readFileSync(file, 'utf8'), lang, this.config).inject();

    if (Object.keys(DirectivesParser.frontMatterData))
      FrontMatterHandler.set(file, DirectivesParser.frontMatterData);

    fileContents = this.translator ? this.translator.processHtml(fileContents) : fileContents;
    writeFileSync(file, fileContents);
  }

}
