import { SitemapGenerator } from '@yassb/config/sitemap-generator.class';
import { BestMatch, findBestMatch } from 'string-similarity';

/**
 * Suggest the best match for the provided URL fragment if no exact match has been found
 */
export class SuggestBestMatch {

  /**
   * The tip text to display in console.
   */
  private finalText: string;
  /**
   * The best match for the URL fragment provided as found by method `findBestMatch` of [`string-similarity`](https://www.npmjs.com/package/string-similarity).
   */
  private bestMatch: BestMatch;
  /**
   * Best match in form of absolute URL from the target value.
   */
  private bestUrl: string;

  /**
   * Creates an instance of suggest best match.
   *
   * @param urlFragment the URL fragment provided in the directive.
   * @param arrayToSearch the full list of the URLs of the website gotten from the sitemap.
   */
  constructor(
    private urlFragment: string,
    private arrayToSearch: Array<string>
  ) { }

  /**
   * Finds the best match and returns the tip text to display in console.
   *
   * @returns the tip text.
   */
  public find(): string {
    this.findBestMatch();

    if (!this.bestMatch || !this.bestMatch.bestMatch)
      return '';

    this.pathToUrl();

    this.buildFinalText();

    return this.finalText;
  }

  /**
   * Formats the final text to display in console.
   */
  private buildFinalText(): void {
    this.finalText = `Did you mean ${this.bestUrl}?`;
  }

  /**
   * Finds the best match for the given URL matching in the Array of URLs from the sitemap.
   */
  private findBestMatch(): void {
    this.bestMatch = findBestMatch(this.urlFragment, this.arrayToSearch);
  }

  /**
   * Removes the fake host from the URL. If the URL contains the real host provided in configuration, it is left in the tip text.
   */
  private pathToUrl(): void {
    this.bestUrl = this.bestMatch.bestMatch.target.replace(SitemapGenerator.fakeHost, '');
  }

}
