/**
 * Constant to store the paths to the assets of the project to elaborate
 */
export const WORKING_DIR = {
  /** Root folder of the project */
  base: undefined as string as string,
  /** Container the whole YASSB project */
  src: undefined as string,
  /** Website assets. It's cloned in `out`. Scripts and Styles are also placed here */
  assets: undefined as string,
  /** Contains the localization files ([lang].json) with translation strings */
  i18n: undefined as string,
  /** Contains all the files processed by YASSB */
  app: undefined as string,
  /** HTML pages of the web site (excluded those to be generated automatically) */
  pages: undefined as string,
  /** Contains HTML files with fragments to be injected into pages (e.g. `footer`) */
  components: undefined as string,
  /** Contains the JSON files with the data to generate iterable items */
  dataSources: undefined as string,
  /** HTML templates to be used when creating pages from .md files */
  pagesToGenerate: undefined as string,
  /** Entry file to be processd by webpack. Can end with: `.js` | `.ts` */
  scripts: undefined as string,
  /** Entry file to be processd by dart-sass. Can end with: `.css` | `.scss` */
  styles: undefined as string,
  /** ALIAS of `app`, default entry point for the user-defined folder in the `generate-from-files` directive.
   *
   * @remarks Need to allow scanning of the root folder of the user "posts" folder cannot have an empty value  */
  posts: undefined as string,
  /** Destination dir of the compiled project - defaults to `dist/public` */
  out: undefined as string,
  /** Destination dir of minified JS file, retains the same name of the entry file + version + min.js */
  scriptsOutFolder: undefined as string,
  /** Destination di of minified css file, retains the same name of the entry file + version + min.css */
  stylesOutFolder: undefined as string
};
