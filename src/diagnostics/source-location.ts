import { existsSync } from 'fs';
import { relative, resolve, sep } from 'path';
import { WORKING_DIR } from '../config/working-dir.constant';
import { GENERATED_PAGES } from '../directives/pages-generator/generated-pages.store';
import { LANGS } from '../i18n/langs.constant';
import { lineOf } from './diagnostics';

/**
 * Source file of a file being processed: pages are processed as copies in `out`, so their problems are reported
 * on the original file in `pages` (or on the template, for generated pages).
 */
export function sourceFileOf(fileFullPath: string): string {
  const generated = GENERATED_PAGES.get(fileFullPath);
  if (generated)
    return generated.template;
  if (!WORKING_DIR.out || !fileFullPath.startsWith(WORKING_DIR.out + sep))
    return fileFullPath;
  let rel = relative(WORKING_DIR.out, fileFullPath);
  const first = rel.split(sep)[0];
  if (LANGS.includes(first))
    rel = rel.slice(first.length + 1);
  const candidate = resolve(WORKING_DIR.pages, rel);
  return existsSync(candidate) ? candidate : fileFullPath;
}

/** File and line where `needle` (usually a directive) appears, for diagnostics. */
export function locate(fileFullPath: string, needle?: string): { file: string; line?: number } {
  const file = sourceFileOf(fileFullPath);
  const line = lineOf(file, needle);
  const generated = GENERATED_PAGES.get(fileFullPath);
  if (line === undefined && generated) {
    // The directive may come from the Markdown file inserted into the template.
    const sourceLine = lineOf(generated.source, needle);
    if (sourceLine !== undefined)
      return { file: generated.source, line: sourceLine };
  }
  return { file, line };
}
