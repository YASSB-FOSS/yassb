import { OptionsKeys } from '@yassb/config/options-keys.enum';
import { workingDirSetter } from '@yassb/config/working-dir-setter.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { langsSetter } from '@yassb/i18n/langs-setter.function';
import { RENDERERS_STORE } from '@yassb/renderers/renderers-store.constant';
import { YassbConfig } from '@yassb/yassb';
import config from 'config';

/**
 * Gets configuration from file. Based on `config`
 *
 * @returns configuration object
 * @see https://www.npmjs.com/package/config
 */
function getConfigurationFromFile(): YassbConfig {
  /**
   * The following values are always set so we can safely check if custom paths have been defined.
   * - `workingDir`
   * - `workingDir`,
   * - `customRenderers`,
   * - `customDirectives`,
   * - `skipsStyles`,
   * - `postProcessors`,
   * - `htmlMinificationOptions`
   */
  const yassbConfig: YassbConfig = {
    workingDir: {},
    customRenderers: {},
    customDirectives: [],
    skipsStyles: false,
    postProcessors: [],
    htmlMinificationOptions: {}
  };

  for (const key in OptionsKeys)
    if (config.has(key))
      yassbConfig[key] = config.get(key);

  return yassbConfig;
}

/**
 * Setups YASSB. After getting the configuration copies the renderers to the `RENDERERS_STORE` store.
 * Then it cals `workingDirSetter` and `langSetter` to set respectively the folders of the project and the languages.
 *
 * @returns `yassbConfig` returns the configuration object so it can be used by build and watch.
 */
export function setupYassb(): YassbConfig {
  const yassbConfig = getConfigurationFromFile();

  if (yassbConfig.customRenderers)
    for (const template in yassbConfig.customRenderers)
      RENDERERS_STORE[template] = yassbConfig.customRenderers[template];

  workingDirSetter(yassbConfig.workingDir);
  langsSetter();

  yassbConfig.workingDir = WORKING_DIR;

  return yassbConfig;

}
