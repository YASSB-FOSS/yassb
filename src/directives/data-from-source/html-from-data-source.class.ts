import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { DirectivePropsGetter, DirectivePropsKeys } from '@yassb/directives/tools/directive-props-getter.class';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { RenderersCaller } from '@yassb/renderers/renderers-caller.class';
import { fileDoesNotExists } from '@yassb/tools/file-does-not-exists.function';
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '@yassb/yassb';
import { readJsonSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Generates HTML content from a data source
 */
export class HtmlFromDataSource extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive
   */
  public static regex = /<!--\s*create-from-data-source\s*=\s*".+\..+"\s*-->/g;

  /**
   * File name of the data source file
   */
  private fileName: string;
  /**
   * Renderer to be used to generate the HTML
   */
  private renderer: string;
  /**
   * Options passed in the directive
   */
  private options: Object;

  /**
   * Creates an instance of html from data source and calls `super` so YassbBaseDirective assigns the args to the protected properties.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  /**
   * Inits html from data source.
   * The directive completes only if the data source and the rendere are both found and valid.
   *
   * @returns init
   */
  public init(): YassbDirectiveResponse {
    this.getDirectiveProps();

    if (!this.fileName) {
      console.error('ERROR: can\'t determine the data source file name. Did you pass it as an argument to `create-from-data-source`?');
      return { html: this.fileContents, data: {} };
    }

    const fullPath = resolve(WORKING_DIR.dataSources, this.fileName);

    if (fileDoesNotExists(fullPath, this.fileName, 'data-source')) {
      console.error(`ERROR: data source ${this.fileName} file not found @ ${fullPath}. Injection of contents aborted.`);
      return { html: this.fileContents, data: {} };
    }

    const dataSrcContents = readJsonSync(fullPath) as string | Array<unknown> | { [key: string]: unknown };
    const componentContent = new RenderersCaller(
      this.fileFullPath,
      this.directiveFullString,
      dataSrcContents,
      this.config,
      this.lang,
      this.renderer,
      this.options
    ).callRenderer();

    return { html: this.fileContents.replace(new RegExp(this.directiveFullString, 'g'), componentContent), data: {} };
  }

  /**
   * Gets directive props by parsing the directiveFullString with `DirectivePropsGetter`
   *
   * @see DirectivePropsGetter
   */
  private getDirectiveProps(): void {
    const directiveProps = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang).parse();
    this.fileName = directiveProps[DirectivePropsKeys['create-from-data-source']] as string;
    this.renderer = directiveProps[DirectivePropsKeys.renderer] as string;
    this.options = directiveProps[DirectivePropsKeys.options];
  }

}
