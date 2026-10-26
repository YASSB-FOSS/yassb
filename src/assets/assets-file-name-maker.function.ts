import { basename, resolve } from 'path';
import { WORKING_DIR } from '../config/working-dir.constant';
import { readTextCached } from '../tools/file-cache';

/**
 * Name of the final JS/CSS file: entry file name + version of the site's package.json + `.min.js`/`.min.css`,
 * e.g. `main-3-23-0.min.js` for `scripts/main.ts` at version 3.23.0.
 */
export function assetsFileNameMaker(scope: 'scripts' | 'styles'): string {
  const packageInfo = JSON.parse(readTextCached(resolve(process.cwd(), 'package.json')));
  const version = String(packageInfo.version).replace(/\./g, '-');
  const fileNameWithExtension = basename(WORKING_DIR[scope]);
  const originalFileName = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('.'));
  const extension = scope === 'scripts' ? 'js' : 'css';
  return `${originalFileName}-${version}.min.${extension}`;
}

/** Public URL of the final JS/CSS file, e.g. `/assets/js/main-1-0-0.min.js`. */
export function assetPublicUrl(scope: 'scripts' | 'styles'): string {
  const folder = scope === 'scripts' ? WORKING_DIR.scriptsOutFolder : WORKING_DIR.stylesOutFolder;
  const relativeFolder = folder.slice(WORKING_DIR.out.length + 1).split('\\').join('/');
  return `/${relativeFolder}/${assetsFileNameMaker(scope)}`;
}
