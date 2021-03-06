import { cleanString } from '@yassb/tools/strings-formatters/string-cleaner-for-filename.function';

/**
 * Converts a string formatted in camelCase to a snake_case formatted one.
 * By default also cleans the string from special characters.
 *
 * @param source the stirng to format.
 * @param [clean] disables cleaning the string from special characters.
 * @returns the string formatted in snake_case
 */
export function camelToSnakeCase(source: string, clean: boolean = true): string {
  let kebab = source.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toLowerCase();
  if (clean)
    kebab = cleanString(kebab);
  if (kebab.startsWith('-'))
    kebab = kebab.substring(1);
  return kebab;
}
