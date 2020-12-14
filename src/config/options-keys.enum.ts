/* eslint-disable no-shadow */
/**
 * Keys of all the ooptions that can be set in the ocnfiguration file.
 * Configuration is based on the node package [`config`](https://www.npmjs.com/package/config).
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
  siteHost = 'siteHost',
  devServerPort = 'devServerPort'
}
