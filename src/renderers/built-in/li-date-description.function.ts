import { DateParser } from '../../tools/dates-helpers/date-parser.class';
import type { LiDateDescription, RendererProps } from '../../yassb';
import { htmlElement } from './html-element.function';

/**
 * Renders `<li><u>date</u>: description</li>` for each item of `source` (without the enclosing `ul`).
 * Dates (`{ start, end }` or `{ raw }`) are formatted in the current language; `end: "-"` means "present".
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
