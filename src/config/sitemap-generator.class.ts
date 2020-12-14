import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { ListFiles } from '@yassb/tools/file-system-helpers/list-files.class';
import { YassbConfig } from '@yassb/yassb';
import { writeFileSync } from 'fs-extra';
import { relative, resolve } from 'path';
import XmlSitemap from 'xml-sitemap';

/**
 * Generates a rudimental sitemap of the website.
 * At the moment mostly used YASSB itself for resolving `url-to` values to create links to other pages.
 */
export class SitemapGenerator {

  /**
   * Fake host of sitemap generator, used unless a custom value is provided in the configuration.
   * During post processing, if the host is the defaul one (fake.host), the sitemap is deleted.
   */
  public static fakeHost = 'http://fake.host/';

  private files: Array<string> = [];
  private sitemap = new XmlSitemap();

  constructor(
    private config: YassbConfig
  ) { }

  /**
   * Makes the sitemap
   */
  public make(): void {
    this.setHost();
    this.setFileList();
    this.elaborateList();
    this.saveToDisk();
  }

  /**
   * Sets the file list to populate the sitemap.
   * No value is passed to ListFiles as we don't want to filter out any file.
   *
   * @see ListFiles
   */
  private setFileList(): void {
    this.files = new ListFiles(WORKING_DIR.out).init();
  }

  /**
   * Sets the host as the one passed in the ocnfiguration or the defaul one
   */
  private setHost(): void {
    const host = (this.config.siteHost) ? this.config.siteHost : SitemapGenerator.fakeHost;
    this.sitemap.setHost(host);
  }

  /**
   * Loops all the files retrieved with by the class ListFiles.
   *
   * @see ListFiles
   */
  private elaborateList(): void {
    this.files.forEach(file => this.processAndAddFile(file));
  }

  /**
   * Elaborates the relative url of the file from the `our` dir and adds it to the sitemap.
   *
   * @param pathToFile the full path to the file on disk.
   */
  private processAndAddFile(pathToFile: string): void {
    const relativeUrl = relative(WORKING_DIR.out, pathToFile);
    this.sitemap.add(relativeUrl);
  }

  /**
   * Saves to disk the sitemap
   */
  private saveToDisk(): void {
    const path = resolve(WORKING_DIR.out, 'sitemap.xml');
    writeFileSync(path, this.sitemap.xml);
  }

}
