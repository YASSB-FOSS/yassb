import { SitemapGenerator } from '@yassb/config/sitemap-generator.class';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { normalize, relative, resolve } from 'path';

/**
 * When for a given URL fragment there are more matches, finds the colsest one.
 *
 * @see UrlToDirective
 */
export class FindClosestPath {

  /**
   * The path separator used by the OS.
   */
  private separator: '/' | '\\';
  /**
   * The final closest URL.
   */
  private closest: string;
  /**
   * The lowest number of slashes found separating the matches for the URL fragment to the origin URL.
   */
  private currentLowestSlashes: number;
  /**
   * List of all the URLs with the same distance from the origin URL.
   */
  private closestListBySlashesNumber: Array<string> = [];

  /**
   * Creates an instance of find closest path.
   *
   * @param currentFileFullPath full path to the file where the UrlTo directive has been invoked.
   * @param pathsFound Array with the list of all the matches.
   */
  constructor(
    private currentFileFullPath: string,
    private pathsFound: Array<string>
  ) { }

  /**
   * Initiates the logic to fine the closest URL.
   *
   * @returns the closest URL.
   */
  public find(): string {
    this.normalizeCurrentFileFullPath();
    this.setSeparator();
    this.goupBySlashes();

    if (this.closestListBySlashesNumber.length === 1)
      return this.closestListBySlashesNumber[0];

    this.pickFromEqualDistance();

    return this.closest;
  }

  /**
   * Normalizes the current file path to ensure slashes are all aligned.
   */
  private normalizeCurrentFileFullPath(): void {
    this.currentFileFullPath = normalize(this.currentFileFullPath);
  }

  /**
   * Sets the separator used by the current OS.
   */
  private setSeparator(): void {
    this.separator = this.currentFileFullPath.includes('/') ? '/' : '\\';
  }

  /**
   * Goups URLs with the lowest same distance from the origin URL.
   */
  private goupBySlashes(): void {
    this.pathsFound.forEach(url => {
      const urlToPath = resolve(WORKING_DIR.out, url.replace(SitemapGenerator.fakeHost, ''));
      const relativePath = relative(this.currentFileFullPath, urlToPath);
      const arrPath = relativePath.split(this.separator);
      if (!this.currentLowestSlashes || arrPath.length <= this.currentLowestSlashes) {
        if (this.currentLowestSlashes > arrPath.length)
          this.closestListBySlashesNumber.length = 0;
        this.currentLowestSlashes = arrPath.length;
        this.closestListBySlashesNumber.push(url);
      }
    });
  }

  /**
   * If more than one URL have the lowest distance from the origin URL, picks the index file, or the first of the list.
   */
  private pickFromEqualDistance(): void {
    let indexPage = 0;
    this.closestListBySlashesNumber.forEach((url, index) => {
      if (url.endsWith('index.html'))
        indexPage = index;
    });
    this.closest = this.closestListBySlashesNumber[indexPage];
  }

}
