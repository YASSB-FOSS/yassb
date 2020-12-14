import { OptionsKeys } from '@yassb/config/options-keys.enum';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { FrontMatterDataStore } from '@yassb/tools/front-matter/front-matter-store.const';
import { GrayMatterOption } from 'gray-matter';
import { Options as MinifyOptions } from 'html-minifier';
import { ConverterOptions } from 'showdown';
import { Configuration } from 'webpack';

/**
 * Args passed to renderers to be used as a destructured object.
 *
 * @property `lang` the language being processed if i18n is enabled, else undefined.
 * @property `source` generic type to be specified when declaring `RenderedProps<T>` (eg. `RenderedProps<string>`).
 * @property `options` content of the `options` attribute parsed from a JSON string.
 */
export interface RendererProps<T> {
  currentFilePath: string;
  lang: string;
  source: T;
  config: YassbConfig;
  options?: unknown;
  frontMatterStore: FrontMatterDataStore;
}

/**
 * Definition of the function expected as a renderer.
 *
 * @param RendererProps when invoked, the Object of type `RendererProps` is passed to the renderer.
 */
export type Renderer = (args: RendererProps<unknown>) => string;

/**
 * Structure of the store of custom renderers.
 *
 * @property `[nameOfRenderer: string]` the key property for each renderer added to the store __must__ be the name of the function to be executed.
 */
export interface RenderersStore {
  [nameOfRenderer: string]: Renderer;
}

/**
 * Constructed Object to be invoked calling `.init()`.
 * Custom directives Classes should implement `YassbDirective`.
 *
 * @interface YassbDirective
 * @method `init` public method executing the directive and returning an Object of type `YassbDirectiveResponse`
 */
export interface YassbDirective {
  init(): YassbDirectiveResponse;
}

/**
 * Constructable Object to be invoked with `new`
 *
 * @interface YassbDirectiveConstructable
 * @param args Object of type `YassbDirectiveProps` with the data shared with the `YassbDirective`.
 */
export interface YassbDirectiveConstructable {
  regex: RegExp;

  new(
    args: YassbDirectiveProps
  ): YassbDirective;
}

/**
 *
 * @interface YassbDirectiveProps
 * @property `fileFullPath` the full path of the file benig processed. This will be a subdirectory of the `out` folder;
 * @property `fileContents` HTML code of the entire page, as already processed by built-in directives.
 * @property `lang` the current language being processed, `undefined` if i18n is no enabled.
 * @property `config` the YASSB configuration object.
 * @property `matchedDirectives` the Array os the full string of the html code invoking the directive as matched by the `CustomDirectiveDeclaration['regex']`
 */
export interface YassbDirectiveProps {
  fileFullPath: string;
  fileContents: string;
  lang: string;
  config: YassbConfig;
  directiveFullString?: string;
  frontMatterStore?: FrontMatterDataStore;
}

/**
 * Response to be returned by the method `init` of a `YassbDirective`.
 *
 * @interface YassbDirectiveResponse
 * @property `html` the full string of the HTML code passed as `YassbDirectiveProps['fileContents']` to the directive and as modified by the directive itself.
 * @property `data` Object with any value to be added as Front Matter compatible information to the HTML page for post processing action. These info will be removed after post processing.
 */
export interface YassbDirectiveResponse {
  html: string;
  data: { [key: string]: any };
}

/**
 * Array with all the constuctable Classes implementing a `YassbDirective`.
 */
export type CustomDirectivesStore = Array<YassbDirectiveConstructable>;

/**
 * A function that, givn the path to the source styles, parses them and return the final css to be saved.
 * Parsers do not need tosave to disk any data.
 *
 * @param absolutePathToFile the full path to the source style.
 * @param relativePathToOrigin the path to the styles relative to the root folder of the project.
 * @param relativePathToDestination the output folder, relative to the root folder of the project.
 */
export type CustomStylesParser = (absolutePathToFile: string, relativePathToOrigin: string, relativePathToDestination: string) => Promise<string | Buffer> | string | Buffer;

export type PostProcessor = (fileContents: string) => string;

/**
 * Configuration options for YASSB, to be passed as the defaul export in `/config/default.[js/ts]`.
 *
 * @property `username` used to protect personal info. When passing a path to `generate-from-files`, the username contained in the path can be replaced with USERNAME. YASSB will replace USERNAME with the value passed in the options as `username`.
 * @property `customRenderers` used to define custom renderers. These can be any JS | TS | JSX | TSX function and must return a string. During compilation renderers receive one argument of type `RendererProps`
 * @property `customDirectives` used to define custom directives. These can be a JS | TS Class and must return the full HTML code passed to them. During compilation directives receive one argument of type `YassbDirectiveProps`
 * @property `workingDir` object defining custom dir names for projects files. Currrently the folder hierarchy is mandatory, only dir names can be personalized.
 */
export interface YassbConfig {
  [OptionsKeys.username]?: string;
  [OptionsKeys.customRenderers]?: RenderersStore;
  [OptionsKeys.customDirectives]?: CustomDirectivesStore;
  [OptionsKeys.workingDir]?: Partial<typeof WORKING_DIR>;
  [OptionsKeys.skipsStyles]?: boolean;
  [OptionsKeys.stylesParser]?: CustomStylesParser;
  [OptionsKeys.postProcessors]?: Array<PostProcessor>;
  [OptionsKeys.htmlMinificationOptions]?: MinifyOptions;
  [OptionsKeys.showdownConverterOptions]?: ConverterOptions;
  [OptionsKeys.grayMatterOption]?: GrayMatterOption<string, unknown>;
  [OptionsKeys.webpackConfig]?: Configuration;
  [OptionsKeys.siteHost]?: string;
  [OptionsKeys.devServerPort]?: number;
}

/**
 * Data passed as `source` to the `renderer` by directive `public-file-list`
 *
 * @property `absolutePath` is the path to the file on disk
 * @property `absoluteUrl` is the full url to the page, to be used for example as `href` in a link
 */
export interface FilePathsForPublicFileList {
  absolutePath: string;
  absoluteUrl: string;
}

/**
 * Data source expected for component `create-from-data-source`
 */
export type DataSourceModel = Array<BasicElement> | Array<LiDateDescription> | Array<unknown> | { [key: string]: string | number };

/**
 * Date properties to be specified in liDateDescription renderer.
 *
 * @property `raw` is required if `start` is not provided. Will be rendered as-is, can be any string value.
 * @property `start` is required if `raw` is not provided. The date will be formatted based on the information provided (year only, year and month, year, month and day)
 * @property `end` is optional. If the character `-` is passed, it will be converted to the text "present".
 */
export interface DateModel {
  start?: string;
  end?: string;
  raw?: string;
}

/**
 * Data source expected by `basicElement` renderer.
 *
 * @property `description` content that will be added to the DOM element to generate.
 */
export interface BasicElement {
  description: string;
}

/**
 * Data source expected by `basicElement` renderer if i18n is enabled.
 *
 * @property `description` object where each key is a supported language and the value the text to be displayed.
 */
export interface BasicElementWithI18n {
  description: {
    [lang: string]: string;
  };
}

/**
 * Data source expectd by `liDateDescription` renderer.
 *
 * @property `date` Object of type `DateModel`.
 */
export interface LiDateDescription extends BasicElement {
  date: DateModel;
}

/**
 * Data source expectd by `liDateDescription` renderer if i18n is enabled
 *
 * @property `date` Object of type `DateModel`.
 */
export interface LiDateDescriptionWithI18n extends BasicElementWithI18n {
  date: DateModel;
}
