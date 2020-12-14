import { HtmlFromDataSource } from '@yassb/directives/data-from-source/html-from-data-source.class';
import { InsertScriptSrc } from '@yassb/directives/insert-script-src/insert-script-src.class';
import { InsertStylesSrc } from '@yassb/directives/insert-styles-src.class/insert-styles-src.class';
import { PublicFileList } from '@yassb/directives/public-file-list/public-file-list.class';
import { UrlTo } from '@yassb/directives/url-to/url-to.class';
/* eslint-disable no-shadow */

/**
 * List of all the name of the supported directives in kebab case to match how they appear in HTML attributes.
 * Used to reference the attribute when getting the values from the directive.
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
 * Array of the built-in directives that can be invoked in the forEach loop in DirectivesInvoker.
 *
 * @see DirectivesInvoker
 */
export const BUILT_IN_DIRECTIVES = [
  HtmlFromDataSource,
  PublicFileList,
  InsertScriptSrc,
  InsertStylesSrc,
  UrlTo
];
