import { SitemapGenerator } from '@yassb/config/sitemap-generator.class';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { DirectivePropsGetter } from '@yassb/directives/tools/directive-props-getter.class';
import { FindClosestPath } from '@yassb/directives/url-to/find-closest-path.class';
import { SuggestBestMatch } from '@yassb/directives/url-to/suggest-best-match.class';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { camelToKebabCase } from '@yassb/tools/strings-formatters/camel-to-kebab-case.function';
import { camelToSnakeCase } from '@yassb/tools/strings-formatters/camel-to-snake-case.function';
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '@yassb/yassb';
import { readFileSync } from 'fs-extra';
import { resolve } from 'path';
import XmlSitemap from 'xml-sitemap';

export interface UrlToOptions {
  warning: boolean;
}

/**
 * Creates a full URL from a URL fragment by matching the values in the sitemap.
 * If multiple values are found, the closet one is selected.
 */
export class UrlTo extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /{{\s*url-to\s*=\s*".*?"\s*\s*}}/g;

  /**
   * Url fragment passed to the variable. It can be the full url or just few characters.
   */
  private urlFragment: string;
  /**
   * Options for url-to.
   * Warning: deafult true. If false, the warning of multiple matches is suppressed.
   */
  private options: UrlToOptions = { warning: true };
  /**
   * Anchors found in the fragment url as separated by the symbol `#`.
   */
  private anchors: string;
  /**
   * Url fragment in kebab case (kebab-case) to more easily match filenames.
   */
  private kebabFragment: string;

  /**
   * Url fragment in snake case (kebab_case) to more easily match filenames.
   */
  private snakeFragment: string;
  /**
   * The sitemap used to match the url fragment.
   */
  private sitemap: XmlSitemap;
  /**
   * The full path found in the sitemap.
   */
  private foundUrl: string;
  /**
   * The absolute url to the page to be used in links.
   */
  private absoluteUrl: string;

  /**
   * Creates an instance of url to and calls `super` so YassbBaseDirective assigns the args to the protected properties.
   * Because the name of the js file is known, the only value actually used is `fileContents`.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  /**
   * Inits url to.
   * Aborts if no URL fragment is passed to the directive or if there is no url matching the url fragment.
   *
   * @returns init
   */
  public init(): YassbDirectiveResponse {
    this.setUrlFragment();

    if (!this.urlFragment) {
      this.error(`ERROR: no url or url fragment passed to directive ${this.directiveFullString}.\nYou should pass a value like so: url-to="my-url-fragment".\nNo URL has been injected.`);
      return { html: this.fileContents.replace(this.directiveFullString, ''), data: {} };
    }

    if (this.urlFragment === 'myExampleUrl')
      return { html: this.fileContents, data: {} };

    this.setKebab();
    this.setSnake();
    this.setSitemap();
    this.findUrl();

    if (!this.foundUrl) {
      const tipText = new SuggestBestMatch(this.urlFragment, this.sitemap.urls).find();
      this.error(`ERROR: no URL found for fragment ${this.urlFragment} passed to directive ${this.directiveFullString}. ${tipText}\nNo URL has been injected.`);
      return { html: this.fileContents.replace(this.directiveFullString, ''), data: {} };
    }

    this.setAbsoluteUrl();
    this.setAnchors();

    return { html: this.fileContents.replace(new RegExp(this.directiveFullString, 'g'), this.absoluteUrl), data: {} };
  }

  /**
   * On error removes the directive from the fileContents to avoid issues.
   *
   * @param text text of the error to be displayed in console.
   * @returns the fileContent cleaned from the `directiveFullString`.
   */
  private error(text: string): string {
    console.error(text);
    return this.fileContents.replace(new RegExp(this.directiveFullString, 'g'), ''); ;
  }

  /**
   * Sets the url fragment by invoking `DirectivePropsGetter`.
   * Aborts if no URL was found.
   */
  private setUrlFragment(): void {
    const props = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang).parse();
    if (!props['url-to'] || typeof props['url-to'] !== 'string')
      return;

    if (props['options'])
      this.options = props['options'] as unknown as UrlToOptions;

    const arrString = props['url-to'].split('#');
    this.urlFragment = arrString[0];
    if (arrString[1])
      this.anchors = `#${arrString[1]}`;
  }

  /**
   * Sets the URL fragment in kebab case
   */
  private setKebab(): void {
    this.kebabFragment = camelToKebabCase(this.urlFragment, false);
  }

  /**
   * Sets the URL fragment in snake case
   */
  private setSnake(): void {
    this.snakeFragment = camelToSnakeCase(this.urlFragment, false);
  }

  /**
   * Loads the sitemap
   */
  private setSitemap(): void {
    const xmlString = readFileSync(resolve(WORKING_DIR.out, 'sitemap.xml'), 'utf8');
    this.sitemap = new XmlSitemap(xmlString);
  }

  /**
   * Looks for the url fragment in the sitemap.
   * If multiple results are found selects the first.
   * If nothing is found it returns without setting the value of `foundUrl`.
   */
  private findUrl(): void {
    const finds: Array<string> = this.sitemap.urls.filter((url: string) =>
      url.toLowerCase().includes(this.urlFragment.toLowerCase()) ||
      url.toLowerCase().includes(this.kebabFragment.toLowerCase()) ||
      url.toLowerCase().includes(this.snakeFragment.toLowerCase())
    );
    if (!finds)
      return;

    this.pickTheFullUrl(finds);
  }

  private pickTheFullUrl(finds: Array<string>): void {
    const foundUrl = (finds.length > 1) ? new FindClosestPath(this.fileFullPath, finds).find() : finds[0];
    if (finds.length > 1 && this.options.warning === true)
      console.error(`WARNING: multiple URL matches found for ${this.urlFragment} in directive ${this.directiveFullString}. Using url ${foundUrl}. If this is not the URL you intended, please provide a longer URL fragment.\nTo suppress this warning add to the directive the text \`no-warn\`\n`);
    this.foundUrl = foundUrl;
  }

  /**
   * Sets the absolute url to be used as a link.
   */
  private setAbsoluteUrl(): void {
    const host = this.config.siteHost ? this.config.siteHost : SitemapGenerator.fakeHost;
    this.absoluteUrl = this.foundUrl.replace(host, '/');
  }

  /**
   * If the URL fragment had anchors these are readded to the final URL.
   */
  private setAnchors(): void {
    if (this.anchors)
      this.absoluteUrl = `${this.absoluteUrl}${this.anchors}`;
  }
}
