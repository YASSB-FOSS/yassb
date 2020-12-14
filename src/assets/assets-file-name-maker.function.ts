import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { readJSONSync } from 'fs-extra';
import { basename, resolve } from 'path';

/**
 * Creates the filename for the minified final js | css file. Starts from the origin filename and adds the version from package.json and adds .min.
 *
 * @returns filename
 */
export function assetsFileNameMaker(scope: 'scripts' | 'styles'): string {
  const packageInfo = readJSONSync(resolve(process.cwd(), 'package.json'));
  const version = packageInfo.version.replace(/\./g, '-');
  const fileNameWithExtension = basename(WORKING_DIR[scope]);
  const originalFileName = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('.'));
  const extension = scope === 'scripts' ? 'js' : 'css';
  return `${originalFileName}-${version}.min.${extension}`;
}
