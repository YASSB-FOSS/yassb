/* eslint-disable no-shadow */
/**
 * Keys of all the options that can be set in the configuration file. See `YassbConfig` in `src/yassb.ts`.
 */
export enum OptionsKeys {
  username = 'username',
  customRenderers = 'customRenderers',
  customDirectives = 'customDirectives',
  workingDir = 'workingDir',
  skipsStyles = 'skipsStyles',
  stylesParser = 'stylesParser',
  postProcessors = 'postProcessors',
  htmlMinificationOptions = 'htmlMinificationOptions',
  showdownConverterOptions = 'showdownConverterOptions',
  grayMatterOption = 'grayMatterOption',
  webpackConfig = 'webpackConfig',
  esbuildOptions = 'esbuildOptions',
  siteHost = 'siteHost',
  devServerPort = 'devServerPort',
  sitemap = 'sitemap',
  cleanOut = 'cleanOut',
  strict = 'strict',
  i18n = 'i18n',
  beforeBuild = 'beforeBuild',
  afterBuild = 'afterBuild'
}
