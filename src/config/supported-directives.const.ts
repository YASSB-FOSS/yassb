import { HtmlFromDataSource } from '../directives/data-from-source/html-from-data-source.class';
import { InsertScriptSrc } from '../directives/insert-script-src/insert-script-src.class';
import { InsertStylesSrc } from '../directives/insert-styles-src/insert-styles-src.class';
import { PublicFileList } from '../directives/public-file-list/public-file-list.class';
import { UrlTo } from '../directives/url-to/url-to.class';
/* eslint-disable no-shadow */

/**
 * Names of the built-in directives, as written in HTML.
 *
 * @internal
 */
export enum SupportedDirectives {
  component = 'component',
  'create-from-data-source' = 'create-from-data-source',
  'generate-from-files' = 'generate-from-files',
  'public-file-list' = 'public-file-list',
  'include-script-src' = 'include-script-src',
  'include-styles-src' = 'include-styles-src',
  'url-to' = 'url-to'
}

/**
 * Built-in directives run on every file after `component` (see `DirectivesInvoker`), in this order.
 * `component` and `generate-from-files` are handled separately (`DirectivesParser`, `GeneratePagesFromMd`).
 *
 * @featurePart behaviour.pipeline
 */
export const BUILT_IN_DIRECTIVES = [
  HtmlFromDataSource,
  PublicFileList,
  InsertScriptSrc,
  InsertStylesSrc,
  UrlTo
];
