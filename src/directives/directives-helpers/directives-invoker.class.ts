import { BUILT_IN_DIRECTIVES } from '@yassb/config/supported-directives.const';
import { extractDirectives } from '@yassb/directives/tools/extract-directives.function';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { FRONT_MATTER_DATA_STORE } from '@yassb/tools/front-matter/front-matter-store.const';
import {
  YassbDirective,
  YassbDirectiveConstructable,
  YassbDirectiveProps,
  YassbDirectiveResponse
  } from '@yassb/yassb';

/**
 * Invokes built-in and custom directives in the order they are found in the respective `Array` stores.
 */
export class DirectivesInvoker extends YassbBaseDirective implements YassbDirective {

  /**
   * Object to store any Front Matter data processed by each the directive
   */
  private data: { [key: string]: string } = {};

  /**
   * Creates an instance of directives invoker and calls `super` on `YassbBaseDirective` to assigne args properties to the protected properies.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  /**
   * Inits directives invoker by looping with `forEach` on an `Array` where built-in and custom directives are merged.
   *
   * @returns init
   */
  public init(): YassbDirectiveResponse {
    [...BUILT_IN_DIRECTIVES, ...this.config.customDirectives].forEach(directive => this.checkIfDirectiveInvoked(directive));
    return { html: this.fileContents, data: this.data };
  }

  /**
   * Checks if directive has a rege and, if so, checks if the directive is found in the file being processed.
   *
   * @param directive the not yet constructed directive object with the static property `reges`
   */
  private checkIfDirectiveInvoked(directive: YassbDirectiveConstructable): void {
    if (!directive.regex) {
      console.error(`ERROR: no regex found for custom directive \`${directive.name}\`\nCustom directive skipped.`);
      return;
    }

    const matchedDirectives = extractDirectives(this.fileContents, directive.regex);
    if (matchedDirectives && matchedDirectives.length)
      matchedDirectives.forEach(directiveFullString => this.doInvoke(directiveFullString, directive));
  }

  /**
   * Do invokes the directive if there are any matches.
   *
   * @param directiveFullString the full string, with decorators, of the matched directive.
   * @param directive the not yet contructed directive object.
   */
  private doInvoke(directiveFullString: string, directive: YassbDirectiveConstructable): void {
    const props: YassbDirectiveProps = {
      fileFullPath: this.fileFullPath,
      fileContents: this.fileContents,
      lang: this.lang,
      config: this.config,
      directiveFullString,
      frontMatterStore: FRONT_MATTER_DATA_STORE
    };
    const { html, data } = new directive(props).init();
    this.elaborateDirectiveResponse(html, data);
  }

  /**
   * Elaborates the directive response by updating the file contents and adding Front Matter data to the data store.
   *
   * @param html the new contents of the file after the directive has been executed.
   * @param data any Front Matter data found in the file, to be stored so it's passed to DirectivesParser and saved on the file for later use.
   */
  private elaborateDirectiveResponse(html: string, data: { [key: string]: string }): void {
    this.fileContents = html;
    for (const key in data)
      if (data[key])
        this.data[key] = data[key];
  }

}
