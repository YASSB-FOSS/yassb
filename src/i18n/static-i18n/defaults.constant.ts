/* eslint-disable no-null/no-null */
/**
 * Deafult values used by the translator.
 * These options are not customizable for now in the configuration.
 */
export const DEFAULTS: I18nOptions = {
  selector: '[data-t]',
  attrSelector: '[data-attr-t]',
  interpolateSelector: '[data-t-interpolate]',
  attrInterpolateSelector: '[data-attr-t-interpolate]',
  xml: false,
  useAttr: true,
  replace: false,
  locales: ['en'],
  locale: 'en',
  files: '**/*.html',
  baseDir: process.cwd(),
  removeAttr: true,
  outputDir: null,
  attrSuffix: '-t',
  attrInterpolateSuffix: '-t-interpolate',
  allowHtml: false,
  exclude: [],
  fileFormat: 'json',
  localeFile: '__lng__.json',
  outputDefault: '__file__',
  outputOther: '__lng__/__file__',
  localesPath: 'locales',
  outputOverride: {}
};

/**
 * Definition of the supported options for the translator library.
 */
export interface I18nOptions {
  selector: '[data-t]' | string;
  attrSelector: '[data-attr-t]' | string;
  interpolateSelector: '[data-t-interpolate]' | string;
  attrInterpolateSelector: '[data-attr-t-interpolate]' | string;
  xml: boolean;
  useAttr: boolean;
  replace: boolean;
  locales: Array<string>;
  locale: string;
  files: string;
  baseDir: string;
  removeAttr: boolean;
  outputDir: string;
  attrSuffix: string;
  attrInterpolateSuffix: '-t-interpolate' | string;
  allowHtml: boolean;
  exclude: Array<any>;
  fileFormat: 'json' | string;
  readonly localeFile: '__lng__.json';
  readonly outputDefault: '__file__';
  readonly outputOther: '__lng__/__file__';
  localesPath: string;
  outputOverride: { [index: string]: string };
}
