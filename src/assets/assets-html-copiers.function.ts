import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { copySync } from 'fs-extra';
import { relative, resolve } from 'path';

/**
 * Copys all files from the assets folder to the asset folder in `out`
 */
export function copyAssets(): void {
  const assetsOrigPath = WORKING_DIR.assets;
  const relativeAssetsPath = relative(WORKING_DIR.src, assetsOrigPath);
  const assetsDestPath = resolve(WORKING_DIR.out, relativeAssetsPath);
  copySync(assetsOrigPath, assetsDestPath);
}

/**
 * Copys all files in the `pages` folder in the main `out` dir, respecting the hierarchies of folders.
 * In this way all pages of the website are available in the `out` folder and their content can be overwritten when injecting directives.
 *
 * @param [lang]
 */
export function copyPages(lang?: string): void {
  const dest = lang ? resolve(WORKING_DIR.out, lang) : WORKING_DIR.out;
  const pagesOrigPath = WORKING_DIR.pages;
  copySync(pagesOrigPath, dest);
}
