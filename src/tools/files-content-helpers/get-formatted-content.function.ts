import matter from 'gray-matter';
import type { YassbConfig } from '../../yassb';
import { readTextCached } from '../file-cache';
import { SupportedFormats } from './supported-formats.enum';
import { ParsedFile, TextFormatterParser } from './text-formatter-parser.class';

/**
 * Contents of a component: Markdown/text files are converted to HTML; HTML/SVG files are read as they are.
 * Front matter is separated in both cases.
 *
 * @featurePart directive.component
 */
export function getFormattedContent(pathToFile: string, extension: SupportedFormats, config: YassbConfig): ParsedFile {
  switch (extension) {
    case SupportedFormats.md:
    case SupportedFormats.txt:
      return new TextFormatterParser(pathToFile, config).do();
    default: {
      const parsed = matter(readTextCached(pathToFile));
      return { content: parsed.content, data: { ...parsed.data } };
    }
  }
}
