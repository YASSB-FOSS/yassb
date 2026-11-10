import tailwindcss from '@tailwindcss/postcss';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss from 'postcss';
import type { YassbConfig } from 'yassb-web';

/**
 * Tailwind CSS 4 through PostCSS, minified. Tailwind finds the class names in the project files (src/, builder/),
 * skipping what .gitignore ignores.
 */
async function tailwind(entry: string, _entry: string, output: string): Promise<string> {
  const result = await postcss([tailwindcss({ base: resolve(__dirname, '..'), optimize: { minify: true } })])
    .process(readFileSync(entry, 'utf8'), { from: entry, to: output });
  return result.css;
}

/**
 * How the stylesheet is compiled: src/app/styles/styles.css with Tailwind instead of Sass.
 */
export const styles: Partial<YassbConfig> = {
  workingDir: { styles: 'styles/styles.css' },
  stylesParser: tailwind
};
