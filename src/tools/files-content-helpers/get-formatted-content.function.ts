import { SupportedFormats } from '@yassb/tools/files-content-helpers/supported-formats.enum';
import { ParsedFile, TextFormatterParser } from '@yassb/tools/files-content-helpers/text-formatter-parser.class';
import { read } from 'gray-matter';

/**
 * Gets formatted content according to the type of file being processed.
 *
 * @param pathToFile the full absolute path to the file.
 * @param extension the extension as a string of the file being processed.
 * @returns  the html and the whole data gotten from `gray-matter`
 */
export function getFormattedContent(pathToFile: string, extension: SupportedFormats): ParsedFile {
  switch (extension) {
    case SupportedFormats.md:
    case SupportedFormats.txt:
      return new TextFormatterParser(pathToFile).do();
    default:
      return read(pathToFile);
  }
}
