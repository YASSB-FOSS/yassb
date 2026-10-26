import type { DateModel } from '../../yassb';
import { DateLocalizer } from './date-localizer.class';

/**
 * Formats a `DateModel` (`{ start, end }` or `{ raw }`) as text, e.g. `March 2019 - present`.
 * `end: "-"` becomes `<span data-t="PRESENT"></span>`, translated by i18n.
 *
 * @featurePart renderer.liDateDescription
 */
export class DateParser {

  constructor(
    private dateObject: DateModel,
    private lang: string = 'en'
  ) { }

  public parse(): string {
    if (this.dateObject.raw)
      return this.dateObject.raw;

    let finalDate = new DateLocalizer(this.dateObject.start as string, this.lang).localize();

    if (!this.dateObject.end)
      return finalDate;

    finalDate += ' - ';
    finalDate += (this.dateObject.end === '-') ? '<span data-t="PRESENT"></span>' : new DateLocalizer(this.dateObject.end, this.lang).localize();
    return finalDate;
  }

}
