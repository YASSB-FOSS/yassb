import { assetsFileNameMaker } from '@yassb/assets/assets-file-name-maker.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { logDone } from '@yassb/tools/loggers.function';
import { YassbConfig } from '@yassb/yassb';
import { ensureDirSync, ensureFileSync, writeFileSync } from 'fs-extra';
import { renderSync } from 'node-sass';
import { resolve } from 'path';

/**
 * Sass parser, takes a scss file and outputs the compressed css file to the output dir
 *
 * @param [isWatching] used in watch mode
 */
export class StylesParser {

  private pathToStyle: string;
  private newFileName: string;
  private pathToFinalCss: string;
  private finalCss: string | Buffer;

  constructor(
    private config: YassbConfig
  ) { }

  public async parse(): Promise<void> {
    this.createCssFolder();
    this.pathToStyle = resolve(WORKING_DIR.styles);
    this.newFileName = assetsFileNameMaker('styles');
    this.pathToFinalCss = resolve(WORKING_DIR.stylesOutFolder, this.newFileName);
    if (this.config.stylesParser)
      await this.parseWithCustom();
    else
      this.parseWithNodesSass();
    writeFileSync(this.pathToFinalCss, this.finalCss);
    logDone('styles');
  }

  private parseWithNodesSass(): void {
    const result = renderSync({
      file: this.pathToStyle,
      outputStyle: 'compressed',
      omitSourceMapUrl: true
    });
    this.finalCss = result.css;
  }

  private async parseWithCustom(): Promise<void> {
    this.finalCss = await this.config.stylesParser(this.pathToStyle, this.pathToStyle, this.pathToFinalCss);
  }

  /**
   * Creates entry point styles file (if it does not exist) and the output css folder
   */
  private createCssFolder(): void {
    ensureDirSync(WORKING_DIR.stylesOutFolder);
    ensureFileSync(WORKING_DIR.styles);
  }

}
