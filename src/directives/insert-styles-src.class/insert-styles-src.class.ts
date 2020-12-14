import { assetsFileNameMaker } from '@yassb/assets/assets-file-name-maker.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '@yassb/yassb';
import { relative } from 'path';

export class InsertStylesSrc extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive
   */
  public static regex = /<!-- include-styles-src -->/g;

  /**
   * Filename  of the css file to link to.
   */
  private filename: string;
  /**
   * Absolute url to the css file.
   */
  private absoluteUrl: string;
  /**
   * HTML code with the link to the styles file.
   */
  private stylesElement: string;

  /**
   * Creates an instance of insert styles src and calls `super` so YassbBaseDirective assigns the args to the protected properties.
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
    this.setStylesElement();
    return { html: this.fileContents.replace(/<!-- include-styles-src -->/g, this.stylesElement), data: {} };
  }

  /**
   * Sets the filename of the css file by calling `assetsFileNameMaker`.
   */
  private setFilename(): void {
    this.filename = assetsFileNameMaker('styles');
  }

  /**
   * Sets the absolute url to the css file comparing the `out` folder and the `scriptsOutFolder`.
   */
  private setAbsoluteUrl(): void {
    this.absoluteUrl = relative(WORKING_DIR.out, WORKING_DIR.stylesOutFolder).replace(/\\/g, '/');
  }

  /**
   * Sets the HTML code with the link to the stylesheet.
   */
  private setStylesElement(): void {
    this.stylesElement = `<link rel="stylesheet" href="/${this.absoluteUrl}/${this.filename}">`;
  }
}
