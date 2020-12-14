import { assetsFileNameMaker } from '@yassb/assets/assets-file-name-maker.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '@yassb/yassb';
import { relative } from 'path';

/**
 * Insert script src tag to include the minified js file in webpages.
 */
export class InsertScriptSrc extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /<!-- include-script-src -->/g;

  /**
   * Filename  of the js file to link to.
   */
  private filename: string;
  /**
   * Absolute url to the js file.
   */
  private absoluteUrl: string;
  /**
   * HTML code with the link to the script file.
   */
  private scriptElement: string;

  /**
   * Creates an instance of insert script src and calls `super` so YassbBaseDirective assigns the args to the protected properties.
   * Because the name of the js file is known, the only value actually used is `fileContents`.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  /**
   * Inits the directive and replaces the directive string with the script src HTML code.
   *
   * @returns init
   */
  public init(): YassbDirectiveResponse {
    this.setFilename();
    this.setAbsoluteUrl();
    this.setScriptElement();
    return { html: this.fileContents.replace(/<!-- include-script-src -->/g, this.scriptElement), data: {} };
  }

  /**
   * Sets the filename of the js file by calling `assetsFileNameMaker`.
   */
  private setFilename(): void {
    this.filename = assetsFileNameMaker('scripts');
  }

  /**
   * Sets the absolute url to the js file comparing the `out` folder and the `scriptsOutFolder`.
   */
  private setAbsoluteUrl(): void {
    this.absoluteUrl = relative(WORKING_DIR.out, WORKING_DIR.scriptsOutFolder).replace(/\\/g, '/');
  }

  /**
   * Sets the HTML code with the script src.
   */
  private setScriptElement(): void {
    this.scriptElement = `<script src="/${this.absoluteUrl}/${this.filename}"></script>`;
  }
}
