import { fileDoesNotExists } from '@yassb/tools/file-does-not-exists.function';
import { SupportedFormats } from '@yassb/tools/files-content-helpers/supported-formats.enum';
import { extname } from 'path';

/**
 * Determines whether the path to a file passed to a built-in directive leads to a supported file or not.
 *
 * @param directiveFullString full directive string, to be shown in the error message.
 * @param pathToFile path to the file, needed to check if the file exists and is supported.
 * @param directiveName name of the directive, to be shown in the error message for better identification of the problem.
 * @returns the file extension.
 */
export function canProcessFileExtension(directiveFullString: string, pathToFile: string, directiveName: string): SupportedFormats {
  if (fileDoesNotExists(pathToFile, directiveName, 'component'))
    return;

  const extension = extname(pathToFile) as SupportedFormats;
  if (!Object.values(SupportedFormats).includes(extension)) {
    console.error(`ERROR: unupported file format detected for component \`${directiveName}\` passed in directive \`${directiveFullString}\``);
    return;
  }

  return extension;
}
