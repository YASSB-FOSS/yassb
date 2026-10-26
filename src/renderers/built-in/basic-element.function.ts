import type { BasicElement, RendererProps } from '../../yassb';
import { htmlElement } from './html-element.function';

/**
 * Renders one element per item of `source`, with `item.description` as content (`item.description[lang]` with i18n).
 *
 * Options: `tag` (default `span`, as documented; 1.x wrote `<undefined>` tags when it was omitted),
 * `attributes` (object of attributes for every element).
 *
 * @feature renderer.basicElement
 * @summary Built-in renderer: one element per item, with item.description as content.
 * @usage <ul><!-- create-from-data-source="items.json" renderer="basicElement" options="{"tag":"li","attributes":{"class":"x"}}" --></ul>
 * @options tag (default span); attributes: object applied to every element (true → bare attribute, false → omitted, arrays joined with spaces).
 * @rules source is an array of { description } or, with i18n, { description: { <lang>: text } }; descriptions are inserted as HTML; used as fallback when a directive has no or an unknown renderer.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related directive.create-from-data-source
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
