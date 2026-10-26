import { readFileSync } from 'fs';

/**
 * Read cache for source files that do not change during a build (components, data sources, package.json).
 * Cleared at the start of every build. Callers parse the text again each time, so renderers that mutate
 * their data never affect other pages.
 */
const TEXT_CACHE = new Map<string, string>();

/**
 * @internal
 */
export function readTextCached(path: string): string {
  let text = TEXT_CACHE.get(path);
  if (text === undefined) {
    text = readFileSync(path, 'utf8');
    if (text.charCodeAt(0) === 0xFEFF)
      text = text.slice(1);
    TEXT_CACHE.set(path, text);
  }
  return text;
}

/**
 * @internal
 */
export function clearFileCache(): void {
  TEXT_CACHE.clear();
}
