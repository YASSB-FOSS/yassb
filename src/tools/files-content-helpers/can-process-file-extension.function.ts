import { existsSync } from 'fs';
import { extname } from 'path';
import { report } from '../../diagnostics/diagnostics';
import { locate } from '../../diagnostics/source-location';
import { SupportedFormats } from './supported-formats.enum';

/**
 * Checks that the file of a `component` directive exists and can be included.
 *
 * @param directiveFullString full directive string, for the report.
 * @param pathToFile path of the component.
 * @param directiveName the value written in the directive, for the report.
 * @param includingFile the file containing the directive, for the report.
 * @returns the file extension, or undefined if the file cannot be included (already reported).
 *
 * @featurePart directive.component
 */
export function canProcessFileExtension(directiveFullString: string, pathToFile: string, directiveName: string, includingFile?: string): SupportedFormats | undefined {
  if (!existsSync(pathToFile)) {
    report({
      level: 'error',
      code: 'COMPONENT_NOT_FOUND',
      ...(includingFile ? locate(includingFile, directiveFullString) : {}),
      directive: directiveFullString,
      message: `Component "${directiveName}" not found at ${pathToFile}. Nothing was inserted.`,
      hint: 'Component paths are relative to the components folder (src/app/components by default).'
    });
    return undefined;
  }

  const extension = extname(pathToFile) as SupportedFormats;
  if (!Object.values(SupportedFormats).includes(extension)) {
    report({
      level: 'error',
      code: 'COMPONENT_UNSUPPORTED_FORMAT',
      ...(includingFile ? locate(includingFile, directiveFullString) : {}),
      directive: directiveFullString,
      message: `Unsupported file format for component "${directiveName}" in \`${directiveFullString}\`.`,
      hint: `Supported extensions: ${Object.values(SupportedFormats).join(', ')}.`
    });
    return undefined;
  }

  return extension;
}
