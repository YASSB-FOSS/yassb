import { assetsFileNameMaker } from '@yassb/assets/assets-file-name-maker.function';
import { defaultWebpackConfigMaker } from '@yassb/assets/scripts-parser/default-webpack-config-maker.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { logDone } from '@yassb/tools/loggers.function';
import config from 'config';
import { ensureDirSync } from 'fs-extra';
import webpack, { MultiStats } from 'webpack';

/**
 * Creates the js out folder if it does not exist
 */
function createJsFolder(): void {
  ensureDirSync(WORKING_DIR.scriptsOutFolder);
}

/**
 * Calls webpack after having created the name for the final file and having retrieved the configuration.
 * Executed asynchronously without wait as this process can rpoceed separately from others.
 * Logs done on its own when has finished.
 */
function callWebPack(): void {

  const filename = assetsFileNameMaker('scripts');
  const defaultConfig = defaultWebpackConfigMaker(WORKING_DIR.scripts, WORKING_DIR.scriptsOutFolder, filename);
  const configToUse = (config.has('webpackConfig')) ? config.get('webpackConfig') : defaultConfig;

  try {
    webpack([configToUse], (err: Error, stats: MultiStats) => {
      if (err)
        console.log('webpack ~ err', err);
      const jsonStats = stats?.toJson?.();
      if (jsonStats?.errors?.length > 0)
        console.log(jsonStats.errors);
      if (jsonStats?.warnings?.length > 0)
        console.log(jsonStats.warnings);
      logDone('scripts');
    });
  } catch (error) {
    console.log('TCL: error', error);
  }
}

/**
 * Initiates the logic to produce the final js file with the scripts of the website.
 */
export function scriptsParser(): void {
  createJsFolder();
  callWebPack();
}
