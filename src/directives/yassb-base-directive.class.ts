import { YassbConfig, YassbDirectiveProps } from '@yassb/yassb';

/**
 * General class that other Directive's Class can extend to set all `YassbDirectiveProps` on the Class properties.
 */
export class YassbBaseDirective {

  /**
   * Full path to the file being processed
   */
  protected fileFullPath: string;
  /**
   * File contents there the yassb directive was found
   */
  protected fileContents: string;
  /**
   * Directive full string found in the file
   */
  protected directiveFullString: string;
  /**
   * Full config options
   */
  protected config: YassbConfig;
  /**
   * Lang being processed
   */
  protected lang: string;

  /**
   * Creates an instance of yassb base directive and assignes all args properties to the corresponding protected properties.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    this.fileFullPath = args.fileFullPath;
    this.fileContents = args.fileContents;
    this.directiveFullString = args.directiveFullString;
    this.config = args.config;
    this.lang = args.lang;
  }

}
