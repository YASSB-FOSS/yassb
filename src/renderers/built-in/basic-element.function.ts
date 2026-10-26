import type { BasicElement, RendererProps } from '../../yassb';
import { htmlElement } from './html-element.function';

/**
 * Renders one element per item of `source`, with `item.description` as content (`item.description[lang]` with i18n).
 *
 * Options: `tag` (default `span`, as documented; 1.x wrote `<undefined>` tags when it was omitted),
 * `attributes` (object of attributes for every element).
 */
export function basicElement({ lang, source, options = {} }: RendererProps<Array<BasicElement>, { [key: string]: any }>): string {
  let html = '';
  source.forEach(obj => {
    const description = lang ? (obj.description as unknown as { [lang: string]: string })[lang] : obj.description;
    html += htmlElement({
      name: options.tag || 'span',
      html: description,
      attributes: options.attributes
    });
  });
  return html;
}
