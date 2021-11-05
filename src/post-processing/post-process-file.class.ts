import { CLIENT_SOCKET_SNIPPET_FOR_WATCH } from '@yassb/runners/client-socket-snippet-for-watch.const';
import { FrontMatterHandler } from '@yassb/tools/front-matter/front-matter-handler.class';
import { FrontMatterInjector } from '@yassb/tools/front-matter/front-matter-injector.class';
import { FrontMatterData } from '@yassb/tools/front-matter/front-matter-store.const';
import { YassbConfig } from '@yassb/yassb';
import { readFileSync, writeFileSync } from 'fs-extra';
import { minify } from 'html-minifier';

/**
 * Post processes each file passed by `PostProcessFiles`
 */
export class PostProcessFile {

  /**
   * Contents of the file to post process
   */
  private fileContents: string;
  /**
   * Front Matter data found in `fileContents`
   */
  private fileData: FrontMatterData;

  /**
   * Creates an instance of post process file.
   *
   * @param pathToFile full absolute path to the file being processed
   * @param config full YASSB configuration object
   * @param isWatching determins if in watch mode to skip production-only steps
   */
  constructor(
    private pathToFile: string,
    private config: YassbConfig,
    private isWatching: boolean,
    private shouldRunCustomPostProcessors: boolean = true
  ) { }

  /**
   * Inits post process file logic.
   *
   * @returns init
   */
  public init(): void {
    this.setFileContents();
    this.setFileData();
    this.postProcessFile();
  }

  /**
   * Reads asynchronously the file and sets the contents on `fileContents`.
   *
   * @returns file contents
   */
  private setFileContents(): void {
    this.fileContents = readFileSync(this.pathToFile, 'utf8');
  }

  /**
   * Sets file data by fetching it from `FRONT_MATTER_DATA_STORE`.
   * In this way any Front Matter data is removed from the page and is available for the final injections.
   */
  private setFileData(): void {
    this.fileData = FrontMatterHandler.get(this.pathToFile);
  }

  /**
   * Handles the logic to post process each file by calling the methods in charge of the actions to be performed.
   */
  private postProcessFile(): void {

    this.injectFrontMatterData(this.fileData);

    if (this.shouldRunCustomPostProcessors)
      this.runCustomPostProcessors();

    this.prepareCodeForSaving();

    this.saveToDiskFinalVersionOfFile();
  }

  /**
   * Saves to disk the final version of file
   */
  private saveToDiskFinalVersionOfFile(): void {
    writeFileSync(this.pathToFile, this.fileContents);
  }

  /**
   * Prepares the content to be saved.
   * If in watch mode, addes the WebSocket listener for live reloading.
   * Else minifies the content.
   */
  private prepareCodeForSaving(): void {
    // tslint:disable-next-line: prefer-conditional-expression
    if (this.isWatching && !this.fileContents.includes('WebSocket(\'ws://localhost:3001\')'))
      this.fileContents = this.fileContents.replace('</body>', CLIENT_SOCKET_SNIPPET_FOR_WATCH);
    else
      this.fileContents = minify(this.fileContents, this.config.htmlMinificationOptions);
  }

  /**
   * Runs custom post processors if set in congig.
   */
  private runCustomPostProcessors(): void {
    this.config.postProcessors.forEach(postProcessor => {
      this.fileContents = postProcessor(this.fileContents);
    });
  }

  /**
   * Injects Front Matter data if any was fond in the file.
   *
   * @param fileData Front Matter data retrieved from the store for the current file.
   */
  private injectFrontMatterData(fileData: FrontMatterData): void {
    if (typeof fileData === 'object' && Object.keys(fileData))
      this.fileContents = new FrontMatterInjector(this.fileContents, fileData).inject();
  }

}
