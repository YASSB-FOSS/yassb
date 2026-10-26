import { SupportedDirectives } from '../config/supported-directives.const';
import { report } from '../diagnostics/diagnostics';
import { locate } from '../diagnostics/source-location';
import { canProcessFileExtension } from '../tools/files-content-helpers/can-process-file-extension.function';
import { getDirectiveValues } from '../tools/files-content-helpers/get-directive-value.function';
import { getFormattedContent } from '../tools/files-content-helpers/get-formatted-content.function';
import { FrontMatterInjector } from '../tools/front-matter/front-matter-injector.class';
import type { FrontMatterData } from '../tools/front-matter/front-matter-store.const';
import type { YassbConfig } from '../yassb';
import { DirectivesInvoker } from './directives-helpers/directives-invoker.class';
import { extractDirectives, replaceAllLiteral } from './tools/extract-directives.function';

/** Components nested deeper than this are reported as a cycle. */
const MAX_COMPONENT_DEPTH = 40;

/**
 * Processes the directives of one file (a page, or a component included by a page).
 *
 * Order, as in 1.x:
 * 1. `component` directives, recursively: each component is processed (with its own path) before being inserted;
 * 2. front matter placeholders collected so far;
 * 3. built-in directives, then custom directives (see `DirectivesInvoker`).
 *
 * @feature directive.component
 * @summary Inserts an HTML, SVG or Markdown fragment from the components folder, recursively.
 * @usage <!-- component="site/header.html" -->
 * @options The value is a path relative to src/app/components (workingDir.components); LANG and USERNAME are replaced (see directive.attributes).
 * @rules Each component is processed on its own (its directives run with fileFullPath = the component file) before being inserted into the including file; components can nest; .md/.txt components are converted from Markdown; front matter of a component becomes { key } placeholders of the page; a missing file leaves the comment in place (removed by the minifier); more than 40 levels of nesting is reported as a cycle; the regex accepts one directive per line.
 * @errors COMPONENT_NOT_FOUND, COMPONENT_UNSUPPORTED_FORMAT, COMPONENT_CYCLE
 * @status stable
 * @since 1.0.0
 * @related content.front-matter, content.markdown, directive.attributes
 */
export class DirectivesParser {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /<!--\s*component\s*=\s*".+\..+"\s*-->/g;

  /**
   * Front matter of the page being processed, shared by the nested parsers of its components.
   */
  public static frontMatterData: FrontMatterData = {};

  /**
   * @param fileFullPath the full path to the file being processed.
   * @param fileContents the HTML of the file.
   * @param lang the current language if i18n is enabled.
   * @param config the YASSB configuration.
   * @param keepFrontMatterData true for nested components, so the page's front matter is kept.
   * @param depth nesting level of components.
   */
  constructor(
    private fileFullPath: string,
    private fileContents: string,
    private lang: string,
    private config: YassbConfig,
    private keepFrontMatterData: boolean = false,
    private depth: number = 0
  ) { }

  public inject(): string {

    if (!this.keepFrontMatterData)
      DirectivesParser.frontMatterData = {};

    this.componentDirective();

    if (Object.keys(DirectivesParser.frontMatterData).length)
      this.fileContents = new FrontMatterInjector(this.fileContents, DirectivesParser.frontMatterData).inject();

    this.invokeDirectives();

    return this.fileContents;
  }

  private componentDirective(): void {
    const components = extractDirectives(this.fileContents, DirectivesParser.regex);
    if (Array.isArray(components))
      components.forEach(component => {
        this.fileContents = this.handleComponent(component);
      });
  }

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

  private handleComponent(componentFullString: string): string {
    const directiveData = getDirectiveValues(componentFullString, this.config, SupportedDirectives.component, 'components', this.lang);
    if (!directiveData)
      return this.fileContents;

    if (this.depth >= MAX_COMPONENT_DEPTH) {
      report({
        level: 'error',
        code: 'COMPONENT_CYCLE',
        fatal: true,
        ...locate(this.fileFullPath, componentFullString),
        directive: componentFullString,
        message: `Components are nested more than ${MAX_COMPONENT_DEPTH} levels at \`${componentFullString}\`: a component probably includes itself.`
      });
      return replaceAllLiteral(this.fileContents, componentFullString, '');
    }

    const extension = canProcessFileExtension(componentFullString, directiveData.fullPath, directiveData.directiveMainValue, this.fileFullPath);
    if (!extension)
      return this.fileContents;

    const { content, data } = getFormattedContent(directiveData.fullPath, extension, this.config);

    for (const key in data)
      if (data[key])
        DirectivesParser.frontMatterData[key] = data[key];

    const componentContent = new DirectivesParser(directiveData.fullPath, content, this.lang, this.config, true, this.depth + 1).inject();
    return replaceAllLiteral(this.fileContents, componentFullString, componentContent);
  }

}
