/**
 * Directives found in `text` by `regex` (as `String.prototype.match`, so use the `g` flag).
 *
 * @returns all the matched strings, or null.
 */
export function extractDirectives(text: string, regex: RegExp): Array<string> | null {
  return text.match(regex);
}

/** Replaces every occurrence of `search` with `replacement`, literally (no regex, no `$` patterns). */
export function replaceAllLiteral(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

/** Replaces the first occurrence of `search` with `replacement`, literally. */
export function replaceFirstLiteral(text: string, search: string, replacement: string): string {
  const index = text.indexOf(search);
  return index < 0 ? text : text.slice(0, index) + replacement + text.slice(index + search.length);
}
