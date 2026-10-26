import { existsSync, readdirSync } from 'fs';
import { WORKING_DIR } from '../config/working-dir.constant';
import { LANGS } from './langs.constant';

/**
 * Sets `LANGS` from the `<lang>.json` files of the i18n folder, sorted by file name.
 * No i18n folder (or no JSON in it) means a single-language site: `LANGS` stays empty.
 */
export const langsSetter = (): void => {
  LANGS.length = 0;
  if (!existsSync(WORKING_DIR.i18n))
    return;
  readdirSync(WORKING_DIR.i18n).sort().forEach(fileName => {
    if (fileName.includes('.json'))
      LANGS.push(fileName.replace('.json', ''));
  });
};
