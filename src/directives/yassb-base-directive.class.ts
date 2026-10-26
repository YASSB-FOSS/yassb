import type { YassbConfig, YassbDirectiveProps } from '../yassb';

/**
 * Base class for directives: copies `YassbDirectiveProps` onto protected properties.
 * Exported as `YassbBaseDirective` by `yassb-web` and `yassb-web/tools`.
 *
 * @featurePart api.custom-directives
 */
export class YassbBaseDirective {

  /** Full path to the file being processed (a component in `src`, or the page in `out`). */
  protected fileFullPath: string;
  /** HTML of the file, as processed so far. */
  protected fileContents: string;
  /** The text matched by the directive's regex. */
  protected directiveFullString: string;
  /** The YASSB configuration. */
  protected config: YassbConfig;
  /** Language being processed (undefined without i18n). */
  protected lang: string;

  constructor(args: YassbDirectiveProps) {
    this.fileFullPath = args.fileFullPath;
    this.fileContents = args.fileContents;
    this.directiveFullString = args.directiveFullString as string;
    this.config = args.config;
    this.lang = args.lang;
  }

}
