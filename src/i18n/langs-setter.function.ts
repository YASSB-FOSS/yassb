import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { LANGS } from '@yassb/i18n/langs.constant';
import fs from 'fs-extra';

/**
 * Loads the languages of the website based on the trnalsation files found in the `i18n` folder.
 *
 * @returns setter
 */
export const langsSetter = (): void => {
  const i18nExists = fs.existsSync(WORKING_DIR.i18n);
  if (!i18nExists)
    return;
  const dirLs = fs.readdirSync(WORKING_DIR.i18n);
  dirLs.forEach(fileName => {
    if (fileName.includes('.json'))
      LANGS.push(fileName.replace('.json', ''));
  });
};
