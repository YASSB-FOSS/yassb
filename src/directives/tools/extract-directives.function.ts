/**
 * Extracts directives fount in text by searching the `RegExp`
 *
 * @param text full HTML code to search for comments matching directives
 * @param regex regular expression to match
 * @returns All the strings of the directives found
 */
export function extractDirectives(text: string, regex: RegExp): Array<string> {
  return text.match(regex);
}
