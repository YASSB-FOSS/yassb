import matter from 'gray-matter';
import { Converter } from 'showdown';
import { report } from '../../diagnostics/diagnostics';
import type { YassbConfig } from '../../yassb';
import { readTextCached } from '../file-cache';

/**
 * A text file converted to HTML, with its front matter.
 */
export interface ParsedFile {
  content: string;
  data: { [key: string]: any };
}

/**
 * Reads a Markdown/text file: front matter with gray-matter (`config.grayMatterOption`),
 * content converted to HTML with Showdown (`config.showdownConverterOptions`, default `{ tables: true }`).
 * `excerpt` and `language` found by gray-matter are added to the front matter.
 */
export class TextFormatterParser {

  constructor(
    private pathToFile: string,
    private config: YassbConfig
  ) { }

  public do(): ParsedFile {
    const parsed = matter(readTextCached(this.pathToFile), (this.config.grayMatterOption || {}) as never) as matter.GrayMatterFile<string>;

    if (!parsed.content)
      report({ level: 'warning', code: 'MARKDOWN_EMPTY', file: this.pathToFile, message: `Empty file: nothing to insert from ${this.pathToFile}.` });

    const showdownOptions = this.config.showdownConverterOptions || { tables: true };
    const content = new Converter(showdownOptions as never).makeHtml(parsed.content);

    const data = { ...parsed.data };
    if (!data.excerpt && parsed.excerpt)
      data.excerpt = parsed.excerpt;

    if (!data.language && parsed.language)
      data.language = parsed.language;

    return { content, data };
  }

}
