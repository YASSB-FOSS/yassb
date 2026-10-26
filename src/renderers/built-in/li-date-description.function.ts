import { DateParser } from '../../tools/dates-helpers/date-parser.class';
import type { LiDateDescription, RendererProps } from '../../yassb';
import { htmlElement } from './html-element.function';

/**
 * Renders `<li><u>date</u>: description</li>` for each item of `source` (without the enclosing `ul`).
 * Dates (`{ start, end }` or `{ raw }`) are formatted in the current language; `end: "-"` means "present".
 *
 * @feature renderer.liDateDescription
 * @summary Built-in renderer: <li><u>date</u>: description</li> per item, with localized dates.
 * @usage <ul><!-- create-from-data-source="timeline.json" renderer="liDateDescription" --></ul>
 * @options none
 * @rules date is { start, end } with YYYY, YYYY/MM or YYYY/MM/DD (formatted in the current language: "March 2020", "March 5, 2020"), end "-" means present (<span data-t="PRESENT">, translated by i18n), or { raw } inserted as is; description as in basicElement.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related renderer.basicElement, i18n.translation
 */
export function liDateDescription({ lang, source }: RendererProps<Array<LiDateDescription>>): string {
  let html = '';
  source.forEach(obj => {
    const date = htmlElement({
      name: 'u',
      html: new DateParser(obj.date, lang).parse()
    });
    const description = lang ? (obj.description as unknown as { [lang: string]: string })[lang] : obj.description;
    html += htmlElement({
      name: 'li',
      html: `${date}: ${description}`
    });
  });
  return html;
}
