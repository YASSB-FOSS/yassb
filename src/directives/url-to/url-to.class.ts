import { report } from '../../diagnostics/diagnostics';
import { locate } from '../../diagnostics/source-location';
import { SITEMAP_URLS, SitemapGenerator } from '../../sitemap/sitemap-generator.class';
import { camelToKebabCase } from '../../tools/strings-formatters/camel-to-kebab-case.function';
import { camelToSnakeCase } from '../../tools/strings-formatters/camel-to-snake-case.function';
import type { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { DirectivePropsGetter } from '../tools/directive-props-getter.class';
import { replaceAllLiteral, replaceFirstLiteral } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';
import { FindClosestPath } from './find-closest-path.class';
import { SuggestBestMatch } from './suggest-best-match.class';

/**
 * @featurePart directive.url-to
 */
export interface UrlToOptions {
  warning: boolean;
}

/**
 * `{{ url-to="fragment#anchor" }}` → absolute URL (`/it/blog/post.html#anchor`) of the file of the site whose URL
 * contains the fragment (also tried in kebab-case and snake_case). With several matches the closest file wins;
 * `options="{"warning":false}"` silences the warning.
 *
 * @feature directive.url-to
 * @summary Replaced by the absolute URL of the output file whose path contains a fragment.
 * @usage <a href="{{ url-to="about" }}">  <a href="{{ url-to="blog-post#comments" options="{"warning":false}" }}">
 * @options #anchor is kept; options="{"warning":false}" silences the ambiguity warning.
 * @rules The fragment is matched case-insensitively against every URL of the output (also as kebab-case and snake_case); with several matches the file closest to the current page wins, ties go to an index.html; with i18n only pages of languages already built are visible; the host (siteHost or the internal one) is stripped, so the result is root-relative (/en/about/index.html); no match inserts nothing and suggests the closest URL.
 * @errors URL_TO_EMPTY, URL_TO_NOT_FOUND, URL_TO_AMBIGUOUS
 * @status stable
 * @since 1.0.0
 * @related behaviour.sitemap, config.siteHost
 */
export class UrlTo extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the directive.
   */
  public static regex = /{{\s*url-to\s*=\s*".*?"\s*\s*}}/g;

  private urlFragment: string;
  private options: UrlToOptions = { warning: true };
  private anchors: string;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    this.setUrlFragment();
    const where = () => locate(this.fileFullPath, this.directiveFullString);

    if (!this.urlFragment) {
      report({
        level: 'error',
        code: 'URL_TO_EMPTY',
        ...where(),
        directive: this.directiveFullString,
        message: `No URL fragment in \`${this.directiveFullString}\`. No URL was inserted.`,
        hint: 'Write a part of the target file name: {{ url-to="my-page" }}'
      });
      return { html: replaceFirstLiteral(this.fileContents, this.directiveFullString, ''), data: {} };
    }

    if (this.urlFragment === 'myExampleUrl')
      return { html: this.fileContents, data: {} };

    const foundUrl = this.findUrl();

    if (!foundUrl) {
      const tipText = new SuggestBestMatch(this.urlFragment, SITEMAP_URLS).find();
      report({
        level: 'error',
        code: 'URL_TO_NOT_FOUND',
        ...where(),
        directive: this.directiveFullString,
        message: `No file matches "${this.urlFragment}" in \`${this.directiveFullString}\`. No URL was inserted.`,
        hint: tipText || undefined
      });
      return { html: replaceFirstLiteral(this.fileContents, this.directiveFullString, ''), data: {} };
    }

    const host = this.config.siteHost ? this.config.siteHost : SitemapGenerator.fakeHost;
    let absoluteUrl = foundUrl.replace(host, '/');
    if (this.anchors)
      absoluteUrl = `${absoluteUrl}${this.anchors}`;

    return { html: replaceAllLiteral(this.fileContents, this.directiveFullString, absoluteUrl), data: {} };
  }

  private setUrlFragment(): void {
    const props = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang).parse();
    const value = props['url-to'];
    if (!value || typeof value !== 'string')
      return;

    if (props.options)
      this.options = props.options as unknown as UrlToOptions;

    const arrString = value.split('#');
    this.urlFragment = arrString[0];
    if (arrString[1])
      this.anchors = `#${arrString[1]}`;
  }

  private findUrl(): string | undefined {
    const fragment = this.urlFragment.toLowerCase();
    const kebab = camelToKebabCase(this.urlFragment, false).toLowerCase();
    const snake = camelToSnakeCase(this.urlFragment, false).toLowerCase();
    const finds = SITEMAP_URLS.filter(url => {
      const lower = url.toLowerCase();
      return lower.includes(fragment) || lower.includes(kebab) || lower.includes(snake);
    });
    if (!finds.length)
      return undefined;

    const foundUrl = finds.length > 1 ? new FindClosestPath(this.fileFullPath, finds).find() : finds[0];
    if (finds.length > 1 && this.options.warning === true)
      report({
        level: 'warning',
        code: 'URL_TO_AMBIGUOUS',
        ...locate(this.fileFullPath, this.directiveFullString),
        directive: this.directiveFullString,
        message: `Several files match "${this.urlFragment}"; using ${foundUrl}.`,
        hint: 'Write a longer fragment, or add options="{"warning":false}" to silence this.'
      });
    return foundUrl;
  }

}
