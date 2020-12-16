import { copyAssets, copyPages } from '@yassb/assets/assets-html-copiers.function';
import { scriptsParser } from '@yassb/assets/scripts-parser/scripts-parser.function';
import { StylesParser } from '@yassb/assets/styles-parser/styles-parser.class';
import { setupYassb } from '@yassb/config/setup.function';
import { SitemapGenerator } from '@yassb/config/sitemap-generator.class';
import { FilesContentInjector } from '@yassb/directives/files-content-injector.class';
import { GeneratePagesFromMd } from '@yassb/directives/pages-generator/generate-pages-from-md.class';
import { LANGS } from '@yassb/i18n/langs.constant';
import { PostProcessFiles } from '@yassb/post-processing/post-process-files.class';
import { logDone, logStep } from '@yassb/tools/loggers.function';
import { YassbConfig } from '@yassb/yassb';

/**
 * Makes a copy of all static assets to the out dir.
 */
export function doCopyAssets(): void {
  logStep('assets');
  copyAssets();
  logDone('assets');
}

/**
 * Processes the CSS/SCSS to generate the minified CSS file of the website (if any).
 *
 * @param config
 */
export function doStyles(config: YassbConfig): void {
  logStep('styles');
  new StylesParser(config).parse();
}

/**
 * Processes the TS/JS assets to generate the minified JS file of the website (if any).
 *
 * @returns scripts
 */
export async function doScripts(): Promise<void> {
  logStep('scripts');
  scriptsParser();
}

/**
 * Generates pages from texts sources for any template of the project.
 *
 * @param config the full YASSB configuration Object.
 */
export async function doTextsSources(config: YassbConfig): Promise<void> {
  logStep('texts');
  await new GeneratePagesFromMd(config).make();
  logDone('texts');
}

/**
 * Processes all files in the `out` dir.
 *
 * @param config the full YASSB configuration Object.
 * @param [lang] the language being processed.
 */
export function doHtml(config: YassbConfig, lang?: string): void {
  const message = lang ? `.html for lang ${lang}` : '.html';
  logStep(message);
  copyPages(lang);
  new SitemapGenerator(config).make();
  new FilesContentInjector(config).make(lang);
  logDone('.html');
}

/**
 * Posts processing. Awaits all the promises returned for each file processed.
 *
 * @param config the full YASSB configuration Object
 * @param isWatching whether or not we are in watch mode, to avoid unnecessary steps during development.
 */
export async function postProcessing(config: YassbConfig, isWatching: boolean): Promise<void> {
  logStep('Post processing');
  await new PostProcessFiles(config, isWatching).do();
  logDone('Post processing');
}

/**
 * Builds the whole website
 *
 * @param [{ runScripts = true, runStyles = true, skipTexts = false, isWatching = false}] selectively skips steps of the build process. Useful in watch mode.
 */
// eslint-disable-next-line @typescript-eslint/tslint/config
export async function buildAll({ runScripts = true, runStyles = true, skipTexts = false, isWatching = false } = {}): Promise<Array<void>> {
  const promises = [];
  const config = setupYassb();

  console.log('Building...');

  doCopyAssets();

  if (runScripts)
    await doScripts();

  if (!skipTexts) {
    await doTextsSources(config);

    if (LANGS.length)
      LANGS.forEach(lang => doHtml(config, lang));
    else
      doHtml(config);

    promises.push(postProcessing(config, isWatching));
  }

  if (!config.skipsStyles && runStyles)
    promises.push(doStyles(config));

  return Promise.all(promises);

}

