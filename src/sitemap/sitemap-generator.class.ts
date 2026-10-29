import { writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { resolve as resolveUrl } from 'url';
import { WORKING_DIR } from '../config/working-dir.constant';
import { ListFiles } from '../tools/file-system-helpers/list-files.class';
import { isCurrentOutputFile, markOutputFile } from '../tools/output-files.store';
import type { YassbConfig } from '../yassb';

/**
 * URLs of every file currently in `out`, as listed in `sitemap.xml`. Used by `url-to`.
 *
 * @featurePart behaviour.sitemap
 */
export const SITEMAP_URLS: Array<string> = [];

/**
 * Lists every file of `out` (pages, assets, everything) as URLs and writes `out/sitemap.xml`.
 *
 * It is regenerated before each language is processed, so `url-to` sees the pages copied so far.
 * The XML is the same as the one written by `xml-sitemap` in 1.x. Without `siteHost` the host is `http://fake.host/`
 * and the file is deleted at the end of the build; with `sitemap: false` it is never written.
 *
 * @feature behaviour.sitemap
 * @summary sitemap.xml lists every file of the output; it is also the list url-to searches.
 * @usage <out>/sitemap.xml with <loc>https://example.com/en/index.html</loc> entries
 * @options config.siteHost (keeps the file and is the host of the URLs), config.sitemap: false (never written).
 * @rules Regenerated before each language is processed; includes assets and every file written by the current build (not files left in the output by an earlier one); without siteHost the host is http://fake.host/ and the file is deleted at the end of the build (after post-processing); post processors may replace it.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related directive.url-to, config.siteHost, config.sitemap
 */
export class SitemapGenerator {

  /**
   * Host used when `siteHost` is not set.
   */
  public static fakeHost = 'http://fake.host/';

  constructor(
    private config: YassbConfig
  ) { }

  public make(): void {
    const host = this.config.siteHost ? this.config.siteHost : SitemapGenerator.fakeHost;
    const urls = [host];
    // Only files of this build: leftovers of the previous one (an output folder not emptied) would change url-to.
    for (const file of new ListFiles(WORKING_DIR.out).init().filter(path => isCurrentOutputFile(path, WORKING_DIR.out))) {
      const relativeUrl = relative(WORKING_DIR.out, file).split('\\').join('/');
      const url = resolveUrl(host, relativeUrl);
      if (!urls.includes(url))
        urls.push(url);
    }
    SITEMAP_URLS.length = 0;
    SITEMAP_URLS.push(...urls);
    if (this.config.sitemap !== false) {
      const path = resolve(WORKING_DIR.out, 'sitemap.xml');
      writeFileSync(path, SitemapGenerator.toXml(urls));
      markOutputFile(path);
    }
  }

  public static toXml(urls: Array<string>): string {
    const entries = urls.map(url => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  }

}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
