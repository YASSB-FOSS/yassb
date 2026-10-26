import { normalize, relative, resolve } from 'path';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { SitemapGenerator } from '../../sitemap/sitemap-generator.class';

/**
 * Picks, among several URLs matching a `url-to` fragment, the one closest to the current file
 * (fewest path segments between them). Ties go to an `index.html`, else to the first match.
 * Kept identical to 1.x so links resolve to the same pages.
 */
export class FindClosestPath {

  private separator: '/' | '\\';
  private currentLowestSlashes: number | undefined;
  private closestListBySlashesNumber: Array<string> = [];

  constructor(
    private currentFileFullPath: string,
    private pathsFound: Array<string>
  ) { }

  public find(): string {
    this.currentFileFullPath = normalize(this.currentFileFullPath);
    this.separator = this.currentFileFullPath.includes('/') ? '/' : '\\';
    this.groupBySlashes();

    if (this.closestListBySlashesNumber.length === 1)
      return this.closestListBySlashesNumber[0];

    let indexPage = 0;
    this.closestListBySlashesNumber.forEach((url, index) => {
      if (url.endsWith('index.html'))
        indexPage = index;
    });
    return this.closestListBySlashesNumber[indexPage];
  }

  private groupBySlashes(): void {
    this.pathsFound.forEach(url => {
      const urlToPath = resolve(WORKING_DIR.out, url.replace(SitemapGenerator.fakeHost, ''));
      const relativePath = relative(this.currentFileFullPath, urlToPath);
      const arrPath = relativePath.split(this.separator);
      if (!this.currentLowestSlashes || arrPath.length <= this.currentLowestSlashes) {
        if (this.currentLowestSlashes && this.currentLowestSlashes > arrPath.length)
          this.closestListBySlashesNumber.length = 0;
        this.currentLowestSlashes = arrPath.length;
        this.closestListBySlashesNumber.push(url);
      }
    });
  }

}
