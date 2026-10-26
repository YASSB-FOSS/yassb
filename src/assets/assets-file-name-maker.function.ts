import { basename, resolve } from 'path';
import { WORKING_DIR } from '../config/working-dir.constant';
import { readTextCached } from '../tools/file-cache';

/**
 * Name of the final JS/CSS file: entry file name + version of the site's package.json + `.min.js`/`.min.css`,
 * e.g. `main-3-23-0.min.js` for `scripts/main.ts` at version 3.23.0.
 *
 * @feature assets.file-names
 * @summary Output scripts and styles are named after their entry and the site version.
 * @usage scripts/main.ts at version 1.2.0 → main-1-2-0.min.js; styles/styles.scss → styles-1-2-0.min.css
 * @options none (version from the site's package.json)
 * @rules Dots of the version become dashes; changing the version changes the URLs inserted by include-script-src / include-styles-src.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related directive.include-script-src, directive.include-styles-src
 */
export function assetsFileNameMaker(scope: 'scripts' | 'styles'): string {
  const packageInfo = JSON.parse(readTextCached(resolve(process.cwd(), 'package.json')));
  const version = String(packageInfo.version).replace(/\./g, '-');
  const fileNameWithExtension = basename(WORKING_DIR[scope]);
  const originalFileName = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('.'));
  const extension = scope === 'scripts' ? 'js' : 'css';
  return `${originalFileName}-${version}.min.${extension}`;
}

/**
 * Public URL of the final JS/CSS file, e.g. `/assets/js/main-1-0-0.min.js`.
 *
 * @internal
 */
export function assetPublicUrl(scope: 'scripts' | 'styles'): string {
  const folder = scope === 'scripts' ? WORKING_DIR.scriptsOutFolder : WORKING_DIR.stylesOutFolder;
  const relativeFolder = folder.slice(WORKING_DIR.out.length + 1).split('\\').join('/');
  return `/${relativeFolder}/${assetsFileNameMaker(scope)}`;
}
