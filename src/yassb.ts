/**
 * Public types of YASSB.
 *
 * Everything a site needs to type its configuration, renderers and custom directives lives here
 * and is re-exported by `yassb-web` (see `src/index.ts`).
 * The names and shapes of the 1.x types are unchanged; new fields are optional.
 */
import type { Diagnostic } from './diagnostics/diagnostics';
import type { FrontMatterDataStore } from './tools/front-matter/front-matter-store.const';

export type { Diagnostic, DiagnosticLevel } from './diagnostics/diagnostics';
export type { FrontMatterData, FrontMatterDataStore } from './tools/front-matter/front-matter-store.const';

/**
 * Folders of a project. Every value is optional in the configuration: missing values fall back to the defaults below.
 * Paths are relative: `base` to the folder YASSB runs in, `src`/`out` to `base`, `assets`/`i18n`/`app` to `src`,
 * everything else to `app`, except `scriptsOutFolder`/`stylesOutFolder`, which are relative to `out`.
 *
 * @featurePart config.workingDir
 */
export interface WorkingDirConfig {
  /** Root folder of the project. Default: the current folder. */
  base: string;
  /** Default: `src`. */
  src: string;
  /** Copied as is into `out`. Default: `assets` (inside `src`). */
  assets: string;
  /** `<lang>.json` translation files; their names define the languages. Default: `i18n` (inside `src`). */
  i18n: string;
  /** Default: `app` (inside `src`). */
  app: string;
  /** One HTML file per page. Default: `pages` (inside `app`). */
  pages: string;
  /** Fragments included with the `component` directive. Default: `components` (inside `app`). */
  components: string;
  /** JSON files used by `create-from-data-source`. Default: `data-sources` (inside `app`). */
  dataSources: string;
  /** Templates used by `generate-from-files`. Default: `pages-to-generate` (inside `app`). */
  pagesToGenerate: string;
  /** Base folder for the paths passed to `generate-from-files`. Default: `app` itself. */
  posts: string;
  /** Entry file bundled with esbuild. Default: `scripts/main.ts` (inside `app`). */
  scripts: string;
  /** Entry stylesheet. Default: `styles/styles.scss` (inside `app`). */
  styles: string;
  /** Output folder. Default: `dist/public` (inside `base`). */
  out: string;
  /** Default: `assets/js` (inside `out`). */
  scriptsOutFolder: string;
  /** Default: `assets/css` (inside `out`). */
  stylesOutFolder: string;
}

/**
 * Args passed to renderers as one object.
 *
 * @property `currentFilePath` file being processed: a component in `src`, or a page copied to `out`.
 * @property `lang` the language being processed if i18n is enabled, else undefined.
 * @property `source` the parsed contents of the data source (for `public-file-list`, the list of files).
 * @property `sourcePath` absolute path of the data source file (for `public-file-list`, the scanned folder). New in 2.0.
 * @property `options` content of the directive's `options` attribute, parsed from JSON.
 *
 * @featurePart api.custom-renderers
 */
export interface RendererProps<T, O = unknown> {
  currentFilePath: string;
  lang: string;
  source: T;
  sourcePath?: string;
  config: YassbConfig;
  options?: O;
  frontMatterStore: FrontMatterDataStore;
}

/**
 * A renderer turns data into an HTML string.
 * Register it in `config.customRenderers` under the name used in the `renderer` attribute of a directive.
 *
 * @featurePart api.custom-renderers
 */
export type Renderer = (args: RendererProps<any, any>) => string;

/**
 * Store of renderers: the key is the name used in the `renderer="..."` attribute.
 *
 * @featurePart api.custom-renderers
 */
export interface RenderersStore {
  [nameOfRenderer: string]: Renderer;
}

/**
 * Instance of a directive. `init()` is called once per regex match and returns the whole updated HTML.
 *
 * @featurePart api.custom-directives
 */
export interface YassbDirective {
  init(): YassbDirectiveResponse;
}

/**
 * Class of a custom directive: a static `regex` (use the `g` flag) and a constructor receiving `YassbDirectiveProps`.
 *
 * @featurePart api.custom-directives
 */
export interface YassbDirectiveConstructable {
  regex: RegExp;
  new(args: YassbDirectiveProps): YassbDirective;
}

/**
 * Data passed to a directive.
 *
 * @property `fileFullPath` the file being processed. Components are processed first, with their own path in `src`;
 *   the page itself is processed last, with its path in `out`. Check this path to act only on whole pages.
 * @property `fileContents` HTML of the file, as already processed by the previous directives.
 * @property `lang` the language being processed, `undefined` if i18n is not enabled.
 * @property `config` the YASSB configuration object.
 * @property `directiveFullString` the text matched by the directive's regex for this call.
 *
 * @featurePart api.custom-directives
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
 * Returned by `YassbDirective.init()`.
 *
 * @property `html` the full HTML received in `fileContents`, as modified by the directive.
 * @property `data` values made available as front matter placeholders (`{ key }`) to the page.
 *
 * @featurePart api.custom-directives
 */
export interface YassbDirectiveResponse {
  html: string;
  data: { [key: string]: any };
}

/**
 * Custom directives, executed after the built-in ones, in this order.
 *
 * @featurePart api.custom-directives
 */
export type CustomDirectivesStore = Array<YassbDirectiveConstructable>;

/**
 * Compiles the stylesheet and returns the CSS. It does not need to write anything to disk.
 *
 * @param absolutePathToFile the full path to the source style.
 * @param relativePathToOrigin same value as `absolutePathToFile` (kept for compatibility).
 * @param relativePathToDestination the full path of the CSS file that YASSB will write.
 *
 * @featurePart config.stylesParser
 */
export type CustomStylesParser = (absolutePathToFile: string, relativePathToOrigin: string, relativePathToDestination: string) => Promise<string | Buffer> | string | Buffer;

/**
 * Receives the final HTML of a page (after directives and translation) and returns it modified.
 *
 * @featurePart config.postProcessors
 */
export type PostProcessor = (fileContents: string) => string;

/**
 * Options of `html-minifier-terser`, used on every page in `yassb build`.
 *
 * @featurePart config.htmlMinificationOptions
 */
export interface HtmlMinifierOptions {
  caseSensitive?: boolean;
  collapseBooleanAttributes?: boolean;
  collapseInlineTagWhitespace?: boolean;
  collapseWhitespace?: boolean;
  conservativeCollapse?: boolean;
  continueOnParseError?: boolean;
  customAttrAssign?: RegExp[];
  customAttrCollapse?: RegExp;
  customAttrSurround?: RegExp[];
  customEventAttributes?: RegExp[];
  decodeEntities?: boolean;
  html5?: boolean;
  ignoreCustomComments?: RegExp[];
  ignoreCustomFragments?: RegExp[];
  includeAutoGeneratedTags?: boolean;
  keepClosingSlash?: boolean;
  maxLineLength?: number;
  minifyCSS?: boolean | object | ((text: string, type?: string) => string);
  minifyJS?: boolean | object | ((text: string, inline?: boolean) => string);
  minifyURLs?: boolean | string | object | ((text: string) => string);
  preserveLineBreaks?: boolean;
  preventAttributesEscaping?: boolean;
  processConditionalComments?: boolean;
  processScripts?: string[];
  quoteCharacter?: string;
  removeAttributeQuotes?: boolean;
  removeComments?: boolean;
  removeEmptyAttributes?: boolean | ((attrName: string, tag: string) => boolean);
  removeEmptyElements?: boolean;
  removeOptionalTags?: boolean;
  removeRedundantAttributes?: boolean;
  removeScriptTypeAttributes?: boolean;
  removeStyleLinkTypeAttributes?: boolean;
  removeTagWhitespace?: boolean;
  sortAttributes?: boolean;
  sortClassName?: boolean;
  trimCustomFragments?: boolean;
  useShortDoctype?: boolean;
}

/**
 * Summary of a build, passed to the `afterBuild` hook and returned by `runBuild()`.
 *
 * @featurePart config.afterBuild
 */
export interface BuildResult {
  /** False when an error stopped part of the build, or when `strict` is on and any error was reported. */
  ok: boolean;
  durationMs: number;
  diagnostics: Array<Diagnostic>;
  /** Absolute path of the output folder. */
  out: string;
  /** True in `yassb watch`. */
  watchMode: boolean;
}

/**
 * Information passed to the `beforeBuild` hook.
 *
 * @featurePart config.beforeBuild
 */
export interface BuildStartInfo {
  watchMode: boolean;
  out: string;
  langs: Array<string>;
}

/**
 * Configuration of YASSB: the default export of `config/default.ts` (or `.js`/`.json`).
 * Files for other environments (`config/production.ts`, `config/local.ts`, …) are merged on top, as with the `config` package.
 *
 * @featurePart config.files
 */
export interface YassbConfig {
  /**
   * Replaces `USERNAME` in directive values.
   *
   * @feature config.username
   * @summary Replaces USERNAME in directive values.
   * @usage username: 'alex' then <!-- generate-from-files="/home/USERNAME/notes" -->
   * @options string
   * @rules Replaced in every directive before its attributes are read; unset gives the text "undefined".
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related directive.attributes
   */
  username?: string;
  /**
   * Renderers by name, used by `create-from-data-source` and `public-file-list`.
   *
   * @feature config.customRenderers
   * @summary Registers renderers by name.
   * @usage customRenderers: { newsList, peopleCards }
   * @options object name → function
   * @rules A custom renderer with the name of a built-in one replaces it.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related api.custom-renderers
   */
  customRenderers?: RenderersStore;
  /**
   * Classes of custom directives.
   *
   * @feature config.customDirectives
   * @summary Registers custom directive classes.
   * @usage customDirectives: [SiteLayoutDirective]
   * @options array of classes, run in this order
   * @rules Run after the built-in directives, for components and pages.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related api.custom-directives
   */
  customDirectives?: CustomDirectivesStore;
  /**
   * Folder names of the project, see `WorkingDirConfig`.
   *
   * @feature config.workingDir
   * @summary Changes the folders of the project.
   * @usage workingDir: { out: 'public', styles: 'styles/styles.css' }
   * @options base, src, assets, i18n, app, pages, components, dataSources, pagesToGenerate, posts, scripts, styles, out, scriptsOutFolder, stylesOutFolder
   * @rules base relative to the current folder; src and out to base; assets, i18n, app to src; the others to app; scriptsOutFolder and stylesOutFolder to out; missing folders and empty script/style entries are created.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related config.files
   */
  workingDir?: Partial<WorkingDirConfig>;
  /**
   * Skip the stylesheet entirely.
   *
   * @feature config.skipsStyles
   * @summary Disables the stylesheet step.
   * @usage skipsStyles: true
   * @options boolean, default false
   * @rules No CSS file is written; include-styles-src still inserts its link.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related assets.styles
   */
  skipsStyles?: boolean;
  /**
   * Replaces the built-in Sass compiler (e.g. PostCSS + Tailwind).
   *
   * @feature config.stylesParser
   * @summary Replaces Sass with the site's own CSS pipeline (PostCSS, Tailwind…).
   * @usage stylesParser: async (entry, entryAgain, outputPath) => css
   * @options function (absolute entry, same entry, absolute output path) → string | Buffer | Promise
   * @rules Must return the CSS without writing it; runs after the pages (so Tailwind sees generated HTML); in watch it reruns on every page rebuild; an exception fails the build.
   * @errors STYLES_FAILED
   * @status stable
   * @since 1.0.0
   * @related assets.styles
   */
  stylesParser?: CustomStylesParser;
  /**
   * Functions applied to every HTML page at the end, in order.
   *
   * @feature config.postProcessors
   * @summary Functions applied to the final HTML of every page.
   * @usage postProcessors: [(html) => html.replace(...)]
   * @options array of (html: string) => string
   * @rules Run in order after translation and front matter, before minification, in build and watch, for every HTML file of the output; an exception or a non-string result fails the build.
   * @errors POST_PROCESSOR_FAILED
   * @status stable
   * @since 1.0.0
   * @related behaviour.post-processing
   */
  postProcessors?: Array<PostProcessor>;
  /**
   * Minifier options for `yassb build`.
   *
   * @feature config.htmlMinificationOptions
   * @summary Options of html-minifier-terser for yassb build.
   * @usage htmlMinificationOptions: { collapseWhitespace: true, removeComments: true, minifyCSS: true }
   * @options html-minifier-terser options, default {} (almost no change)
   * @rules Not applied in watch; a page the minifier cannot parse is written unminified and reported.
   * @errors MINIFY_FAILED
   * @status stable
   * @since 1.0.0
   * @related behaviour.post-processing
   */
  htmlMinificationOptions?: HtmlMinifierOptions;
  /**
   * Options of the Showdown Markdown converter. Default: `{ tables: true }`.
   *
   * @feature config.showdownConverterOptions
   * @summary Options of the Showdown Markdown converter.
   * @usage showdownConverterOptions: { tables: true, strikethrough: true }
   * @options Showdown options, default { tables: true }
   * @rules Replaces the default entirely (set tables again if needed).
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related content.markdown
   */
  showdownConverterOptions?: object;
  /**
   * Options of gray-matter, used to read front matter.
   *
   * @feature config.grayMatterOption
   * @summary Options of gray-matter for front matter.
   * @usage grayMatterOption: { excerpt: true, excerpt_separator: '<!-- more -->' }
   * @options gray-matter options
   * @rules With excerpt, { excerpt } is available in generated pages.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related content.front-matter
   */
  grayMatterOption?: object;
  /**
   * Legacy: a webpack configuration for the scripts. Requires `webpack` installed in the site. Prefer `esbuildOptions`.
   *
   * @feature config.webpackConfig
   * @summary Legacy: bundles the scripts with the site's webpack configuration.
   * @usage webpackConfig: { entry: ..., output: ..., module: { rules: [...] } }
   * @options a complete webpack configuration
   * @rules Requires webpack (and loaders) installed in the site; the configuration decides entry and output; prefer esbuildOptions.
   * @errors SCRIPTS_FAILED
   * @status legacy
   * @since 1.0.0
   * @related assets.scripts
   */
  webpackConfig?: object;
  /**
   * Extra esbuild options merged into the default scripts build (e.g. `{ target: 'es2020', external: [...] }`). New in 2.0.
   *
   * @feature config.esbuildOptions
   * @summary Extra esbuild options merged into the scripts build.
   * @usage esbuildOptions: { target: 'es2020', external: ['jquery'] }
   * @options esbuild build options
   * @rules Merged over the defaults (entry, IIFE, target es2018, minify, define); overriding outfile/write changes where files go.
   * @errors none
   * @status stable
   * @since 2.0.0
   * @related assets.scripts
   */
  esbuildOptions?: object;
  /**
   * Public host of the site. When set, `sitemap.xml` is kept in the output.
   *
   * @feature config.siteHost
   * @summary Public host of the site.
   * @usage siteHost: 'https://example.com'
   * @options string URL
   * @rules Keeps sitemap.xml in the output, with this host in its URLs; url-to strips the host so links stay root-relative (a host without trailing slash yields //path links, as in 1.x).
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related behaviour.sitemap, directive.url-to
   */
  siteHost?: string;
  /**
   * Port of `yassb watch` / `yassb serve`. Default: 3000.
   *
   * @feature config.devServerPort
   * @summary Port of the dev server.
   * @usage devServerPort: 4000
   * @options number, default 3000
   * @rules --port overrides it; the next free port is used if busy.
   * @errors none
   * @status stable
   * @since 1.0.0
   * @related behaviour.dev-server
   */
  devServerPort?: number;
  /**
   * Set to `false` to never write `sitemap.xml` (url-to keeps working). New in 2.0.
   *
   * @feature config.sitemap
   * @summary Disables sitemap.xml.
   * @usage sitemap: false
   * @options boolean, default true
   * @rules url-to keeps working from memory; a sitemap written by a post processor is not deleted.
   * @errors none
   * @status stable
   * @since 2.0.0
   * @related behaviour.sitemap
   */
  sitemap?: boolean;
  /**
   * Delete the output folder (except dot files such as `.git`) before building. New in 2.0.
   *
   * @feature config.cleanOut
   * @summary Empties the output folder before each build.
   * @usage cleanOut: true  (or yassb build --clean)
   * @options boolean, default false
   * @rules Dot files at the root of the output (.git, .nojekyll) are kept; without it, deleted pages stay in the output.
   * @errors none
   * @status stable
   * @since 2.0.0
   * @related cli.build, assets.copy
   */
  cleanOut?: boolean;
  /**
   * Treat every reported error as fatal: the build exits with code 1. New in 2.0.
   *
   * @feature config.strict
   * @summary Every reported error fails the build.
   * @usage strict: true  (or --strict)
   * @options boolean, default false
   * @rules Without it only fatal problems exit 1; warnings never fail.
   * @errors none
   * @status stable
   * @since 2.0.0
   * @related behaviour.diagnostics
   */
  strict?: boolean;
  /**
   * i18n options. New in 2.0.
   *
   * @feature config.i18n
   * @summary Options of the translation step.
   * @usage i18n: { allowHtml: true }
   * @options allowHtml: insert translations as HTML (default false)
   * @rules Applies to data-t content, not to attributes.
   * @errors none
   * @status stable
   * @since 2.0.0
   * @related i18n.translation
   */
  i18n?: {
    /** Allow HTML in translations (`<span data-t="KEY">` gets the translation as HTML). Default: false. */
    allowHtml?: boolean;
  };
  /**
   * Called before every build, in `build` and in `watch`. New in 2.0.
   *
   * @feature config.beforeBuild
   * @summary Hook called before every build.
   * @usage beforeBuild: ({ watchMode, out, langs }) => { ... }
   * @options function (BuildStartInfo) → void | Promise
   * @rules Runs in build and watch after the config is loaded and the output cleaned; an exception stops the build.
   * @errors HOOK_FAILED
   * @status stable
   * @since 2.0.0
   * @related config.afterBuild
   */
  beforeBuild?: (info: BuildStartInfo) => void | Promise<void>;
  /**
   * Called after every build, in `build` and in `watch`: the place for site validations. New in 2.0.
   *
   * @feature config.afterBuild
   * @summary Hook called after every build, for site validations.
   * @usage afterBuild: (result) => { if (!result.ok) ... }
   * @options function (BuildResult: ok, durationMs, diagnostics, out, watchMode) → void | Promise
   * @rules Runs in build and watch (unlike npm postbuild); an exception fails the build.
   * @errors HOOK_FAILED
   * @status stable
   * @since 2.0.0
   * @related config.beforeBuild
   */
  afterBuild?: (result: BuildResult) => void | Promise<void>;
}

/**
 * Data passed as `source` to the `renderer` by directive `public-file-list`
 *
 * @property `absolutePath` is the path to the file on disk
 * @property `absoluteUrl` is the full url to the page, to be used for example as `href` in a link
 *
 * @featurePart directive.public-file-list
 */
export interface FilePathsForPublicFileList {
  absolutePath: string;
  absoluteUrl: string;
}

/**
 * Data source expected for component `create-from-data-source`
 *
 * @featurePart directive.create-from-data-source
 */
export type DataSourceModel = Array<BasicElement> | Array<LiDateDescription> | Array<unknown> | { [key: string]: string | number };

/**
 * Date properties to be specified in liDateDescription renderer.
 *
 * @property `raw` is required if `start` is not provided. Will be rendered as-is, can be any string value.
 * @property `start` is required if `raw` is not provided. Format `YYYY`, `YYYY/MM` or `YYYY/MM/DD`.
 * @property `end` is optional. If the character `-` is passed, it will be converted to the text "present".
 *
 * @featurePart renderer.liDateDescription
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
 *
 * @featurePart renderer.basicElement
 */
export interface BasicElement {
  description: string;
}

/**
 * Data source expected by `basicElement` renderer if i18n is enabled.
 *
 * @property `description` object where each key is a supported language and the value the text to be displayed.
 *
 * @featurePart renderer.basicElement
 */
export interface BasicElementWithI18n {
  description: {
    [lang: string]: string;
  };
}

/**
 * Data source expected by `liDateDescription` renderer.
 *
 * @property `date` Object of type `DateModel`.
 *
 * @featurePart renderer.liDateDescription
 */
export interface LiDateDescription extends BasicElement {
  date: DateModel;
}

/**
 * Data source expected by `liDateDescription` renderer if i18n is enabled
 *
 * @property `date` Object of type `DateModel`.
 *
 * @featurePart renderer.liDateDescription
 */
export interface LiDateDescriptionWithI18n extends BasicElementWithI18n {
  date: DateModel;
}
