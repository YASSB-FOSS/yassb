import { DateParser } from '@yassb/tools/dates-helpers/date-parser.class';
import { LiDateDescription, RendererProps } from '@yassb/yassb';
import createHtmlElement from 'create-html-element';

/**
 *
 *
 * Renders a list of `li` elements to be used in a HTML list.
 *
 * The first element of each li is preferably a date, but can also be any value if the data is passed on the `raw` key.
 *
 * If data is passed on the `start` or `end` keys, the value is parsed as a date in the current locale if set, else defaults to `en`.
 *
 *
 *
 * @param args the arguments passed to the renderer
 * @returns the full list, __not__ enclosed in a `ul` element, generated from the data in source.
 */
export function liDateDescription({ lang, source, options = {} }: RendererProps<Array<LiDateDescription>>): string {
  let html = '';
  source.forEach(obj => {
    const date = createHtmlElement({
      name: 'u',
      html: new DateParser(obj.date, lang).parse()
    });
    const description = lang ? obj.description[lang] : obj.description;
    html += createHtmlElement({
      name: 'li',
      html: `${date}: ${description}`
    });
  });
  return html;
}
