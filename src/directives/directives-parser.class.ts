import { SupportedDirectives } from '@yassb/config/supported-directives.const';
import { DirectivesInvoker } from '@yassb/directives/directives-helpers/directives-invoker.class';
import { extractDirectives } from '@yassb/directives/tools/extract-directives.function';
import { canProcessFileExtension } from '@yassb/tools/files-content-helpers/can-process-file-extension.function';
import { getDirectiveValues } from '@yassb/tools/files-content-helpers/get-directive-value.function';
import { getFormattedContent } from '@yassb/tools/files-content-helpers/get-formatted-content.function';
import { FrontMatterInjector } from '@yassb/tools/front-matter/front-matter-injector.class';
import { FrontMatterData } from '@yassb/tools/front-matter/front-matter-store.const';
import { YassbConfig } from '@yassb/yassb';

/**
 * Finds all the directives in the html code passed as `fileContents` and calls the executers on each.
 * This acts also as the executer for the `component` directive.
 * In this way the `component` directive is executed recursively on each component before all other directives.
 */
export class DirectivesParser {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /<!--\s*component\s*=\s*".+\..+"\s*-->/g;

  /**
   * Store for all the data retrieved in Front Matter.
   * Static so data persists between child instances of `DirectiveParser` parsing nested components of the same parent file.
   */
  public static frontMatterData: FrontMatterData = {};

  /**
   * Creates an instance of DirectivesParser.
   *
   * @param fileFullPath the full path to the file being processed.
   * @param fileContents The HTML code of the file being analyzed.
   * @param lang The current language if i18n is enabled.
   * @param config The YASSB configuration object.
   * @param keepFrontMatterData Tells DirectivesParser whether to clean or not the static property `frontMatterData`.
   */
  constructor(
    private fileFullPath: string,
    private fileContents: string,
    private lang: string,
    private config: YassbConfig,
    private keepFrontMatterData: boolean = false
  ) { }

  /**
   * Finds directives and executes them recursively.
   * The first directives to be executed recursively is the `component` directive.
   * In this way when the other directives are executed the are presente with the full html code of the page.
   */
  public inject(): string {

    if (!this.keepFrontMatterData)
      DirectivesParser.frontMatterData = {};

    this.componentDirective();

    if (Object.keys(DirectivesParser.frontMatterData).length)
      this.fileContents = new FrontMatterInjector(this.fileContents, DirectivesParser.frontMatterData).inject();

    this.invokeDirectives();

    return this.fileContents;
  }

  /**
   * Loops all `component` directives and injects the content in current fileContents.
   * Inside the loop a new instance of `DirectivesParser` is initiated for each nested components found.
   * In this way when the top level loop ends, the whole page is already available for the following directives
   */
  private componentDirective(): void {
    const components = extractDirectives(this.fileContents, DirectivesParser.regex);
    if (Array.isArray(components))
      components.forEach(component => {
        this.fileContents = this.handleComponent(component);
      });
  }

  /**
   * Loops all built-in and custom directives and delegates to the Class the generation of the HTML.
   * Applies the html to filecontents and if any data has been returned it is added in Front Matter.
   *
   * @see DirectivesInvoker
   */
  private invokeDirectives(): void {
    const { html, data } = new DirectivesInvoker({
      fileFullPath: this.fileFullPath,
      fileContents: this.fileContents,
      config: this.config,
      lang: this.lang
    }).init();
    this.fileContents = html;
    for (const key in data)
      if (data[key])
        DirectivesParser.frontMatterData[key] = data[key];
  }

  /**
   * Analyzes the component directive, gets the content of the directive.
   * After retrieving the contents it initializes a new `DirectivesParser` on the content of the component to look for nested directives.
   * The loop repeats until there are no more nested components.
   *
   * @param componentFullString full string of the directive to execute
   * @remarks
   * Currently there are no check to prevent infinite loops. It would be nice if there were.
   */
  private handleComponent(componentFullString: string): string {
    const directiveData = getDirectiveValues(componentFullString, this.config, SupportedDirectives.component, 'components');

    const extension = canProcessFileExtension(componentFullString, directiveData.fullPath, directiveData.directiveMainValue);
    if (!extension)
      return this.fileContents;

    const { content, data } = getFormattedContent(directiveData.fullPath, extension);

    for (const key in data)
      if (data[key])
        DirectivesParser.frontMatterData[key] = data[key];

    const componentContent = new DirectivesParser(directiveData.fullPath, content, this.lang, this.config, true).inject();
    return this.fileContents.replace(new RegExp(componentFullString, 'g'), componentContent);
  }

}
