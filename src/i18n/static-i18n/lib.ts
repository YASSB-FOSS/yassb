import { DEFAULTS, I18nOptions } from '@yassb/i18n/static-i18n/defaults.constant';
import cheerio from 'cheerio';
import fs from 'fs-extra';
import each from 'lodash/each';
import endsWith from 'lodash/endsWith';
import isEmpty from 'lodash/isEmpty';
import merge from 'lodash/merge';
import some from 'lodash/some';
import { join } from 'path';
/* eslint-disable no-null/no-null */
/* eslint-disable space-before-function-paren */
/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable no-invalid-this */

/**
 * Library that takes care of the actual translation.
 * It works by parsing DOM elements, extracting translation keys and injecting the translated text.
 * Based on `claudetech/node-static-i18n`
 *
 * @see https://github.com/claudetech/node-static-i18n/
 */
type Translations = {
  [index: string]: string;
};

export class Translator {

  private options: I18nOptions;
  private t: Translations;

  constructor(
    private userOptions: Partial<I18nOptions>,
    private locale: string
  ) {
    this.setOptions();
    this.loadResources();
  }

  public processHtml(html: string): string {
    return this.translate(html);
  }

  private loadResources(): void {
    const file = join(this.options.localesPath, this.options.localeFile).replace('__lng__', this.locale);
    this.t = fs.readJsonSync(file);
  }

  private setOptions() {
    this.options = merge({}, DEFAULTS, this.userOptions);
  }

  private translate(html: string) {
    const $ = cheerio.load(html, {
      decodeEntities: false,
      xmlMode: this.options.xml
    });

    const elems = $(this.options.selector);

    const translateAttributes = this.translateAttributes.bind(this);
    $(this.options.attrSelector).each(function () {
      return translateAttributes($(this));
    });

    const translateElem = this.translateElem.bind(this);
    elems.each(function () {
      return translateElem($, this);
    });

    return $.html();
  };

  private getAttrFromSelector(selector: string): string {
    const match = /^\[(.*?)\]$/.exec(selector);
    if (match)
      return match[1];
  }

  private translateAttributes($elem) {
    const selectorAttr = this.getAttrFromSelector(this.options.attrSelector);
    const selectorInterpolateAttr = this.getAttrFromSelector(this.options.attrInterpolateSelector);
    const interpolate = some($elem.attr(), (v, k) => k.endsWith(this.options.attrInterpolateSuffix));
    each($elem.attr(), (v, k) => {
      if (isEmpty(v) || k === selectorAttr) {
        return;
      }
      if (endsWith(k, this.options.attrSuffix)) {
        const isData = this.options.useAttr && k === this.getAttrFromSelector(this.options.selector);
        const attr = isData ? k : k.substring(0, k.length - this.options.attrSuffix.length);
        let trans = this.t[v];
        if (interpolate) {
          trans = v.replace(/{{([^{}]*)}}/g, (aa, bb) => this.t[bb]);
        }
        $elem.attr(attr, trans);
        if (this.options.removeAttr && !isData) {
          return $elem.attr(k, null);
        }
      }
    });
    if ((selectorAttr != null) && this.options.removeAttr) {
      $elem.attr(selectorAttr, null);
    }
    if (selectorInterpolateAttr != null) {
      return $elem.attr(selectorInterpolateAttr, null);
    }
  }

  private translateElem($: typeof cheerio, elem: cheerio.Cheerio) {
    let key;
    let attr;
    const $elem = $(elem);
    if (this.options.useAttr && (attr = /^\[(.*?)\]$/.exec(this.options.selector))) {
      key = $elem.attr(attr[1]);
      if (this.options.removeAttr) {
        $elem.attr(attr[1], null);
      }
    }
    if (isEmpty(key)) {
      key = $elem.text();
    }
    if (isEmpty(key)) {
      return;
    }
    let trans = this.t[key];
    const interpolateAttr = this.getAttrFromSelector(this.options.interpolateSelector);
    const interpolate = $elem.filter(this.options.interpolateSelector).length;
    const tLocal = this.t;
    if (interpolate) {
      trans = trans.replace(/{{([^{}]*)}}/g, function (aa, bb) {
        return tLocal[bb];
      });
    }
    if (this.options.replace) {
      return $elem.replaceWith(trans);
    }
    if (this.options.allowHtml) {
      if (interpolate) {
        $elem.html($elem.html().replace(/{{([^{}]*)}}/g, (aa, bb) => this.t[bb]));
      } else {
        $elem.html(trans);
      }
    } else {
      $elem.text(trans);
    }
    if (this.options.removeAttr && interpolate) {
      return $elem.attr(interpolateAttr, null);
    }
  }

}
