import tailwindcss from '@tailwindcss/postcss';
import { readFileSync } from 'fs';
import postcss from 'postcss';
import { resolve } from 'path';

/**
 * stylesParser: Tailwind CSS 4 through PostCSS, minified. Class names are found in src/ and builder/.
 */
export async function tailwind(entry: string, _entry: string, output: string): Promise<string> {
  const result = await postcss([tailwindcss({ base: resolve(__dirname, '..'), optimize: { minify: true } })])
    .process(readFileSync(entry, 'utf8'), { from: entry, to: output });
  return result.css;
}
