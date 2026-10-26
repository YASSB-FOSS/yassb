import { existsSync, readdirSync } from 'fs';
import { WORKING_DIR } from '../config/working-dir.constant';
import { LANGS } from './langs.constant';

/**
 * Sets `LANGS` from the `<lang>.json` files of the i18n folder, sorted by file name.
 * No i18n folder (or no JSON in it) means a single-language site: `LANGS` stays empty.
 *
 * @feature i18n.languages
 * @summary The languages of the site are the names of the JSON files in src/i18n.
 * @usage src/i18n/en.json, src/i18n/it.json → every page built into <out>/en/ and <out>/it/
 * @options workingDir.i18n changes the folder.
 * @rules Languages are sorted by name and processed in that order; the first one is served at / by the dev server; without the folder (or JSON files) the site is single-language and pages go to <out>/.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related i18n.translation, behaviour.dev-server
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
