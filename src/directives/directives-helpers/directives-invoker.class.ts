import { BUILT_IN_DIRECTIVES } from '../../config/supported-directives.const';
import { describeError, report } from '../../diagnostics/diagnostics';
import { locate } from '../../diagnostics/source-location';
import { FRONT_MATTER_DATA_STORE } from '../../tools/front-matter/front-matter-store.const';
import type { YassbDirective, YassbDirectiveConstructable, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { extractDirectives } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';

/**
 * Runs the built-in directives, then the custom ones, in the order of their stores.
 * Each directive's `init()` is called once per match, with the HTML as updated by the previous calls.
 */
export class DirectivesInvoker extends YassbBaseDirective implements YassbDirective {

  /** Front matter values returned by the directives. */
  private data: { [key: string]: any } = {};

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    [...BUILT_IN_DIRECTIVES, ...(this.config.customDirectives || [])].forEach(directive => this.checkIfDirectiveInvoked(directive));
    return { html: this.fileContents, data: this.data };
  }

  private checkIfDirectiveInvoked(directive: YassbDirectiveConstructable): void {
    if (!directive || !(directive.regex instanceof RegExp)) {
      report({
        level: 'error',
        code: 'DIRECTIVE_NO_REGEX',
        message: `Custom directive \`${directive?.name}\` has no static \`regex\`; it was skipped.`,
        hint: 'Add `static regex = /<!--\\s*my-directive="[^"]*"\\s*-->/g;` to the class.'
      });
      return;
    }

    const matchedDirectives = extractDirectives(this.fileContents, directive.regex);
    if (matchedDirectives && matchedDirectives.length)
      matchedDirectives.forEach(directiveFullString => this.doInvoke(directiveFullString, directive));
  }

  private doInvoke(directiveFullString: string, directive: YassbDirectiveConstructable): void {
    const props: YassbDirectiveProps = {
      fileFullPath: this.fileFullPath,
      fileContents: this.fileContents,
      lang: this.lang,
      config: this.config,
      directiveFullString,
      frontMatterStore: FRONT_MATTER_DATA_STORE
    };
    let response: YassbDirectiveResponse;
    try {
      response = new directive(props).init();
    } catch (error) {
      const { message, detail } = describeError(error);
      report({
        level: 'error',
        code: 'DIRECTIVE_FAILED',
        fatal: true,
        ...locate(this.fileFullPath, directiveFullString),
        directive: directiveFullString,
        message: `Directive ${directive.name} failed on \`${directiveFullString}\`: ${message}`,
        detail
      });
      return;
    }
    if (!response || typeof response.html !== 'string') {
      report({
        level: 'error',
        code: 'DIRECTIVE_FAILED',
        fatal: true,
        ...locate(this.fileFullPath, directiveFullString),
        directive: directiveFullString,
        message: `Directive ${directive.name} returned no HTML for \`${directiveFullString}\`.`,
        hint: 'init() must return { html, data } with the whole updated page in `html`.'
      });
      return;
    }
    this.elaborateDirectiveResponse(response.html, response.data);
  }

  private elaborateDirectiveResponse(html: string, data: { [key: string]: any } = {}): void {
    this.fileContents = html;
    for (const key in data)
      if (data[key])
        this.data[key] = data[key];
  }

}
