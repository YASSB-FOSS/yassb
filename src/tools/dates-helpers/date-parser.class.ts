import { DateLocalizer } from '@yassb/tools/dates-helpers/date-localizer.class';
import { DateModel } from '@yassb/yassb';

/**
 * Parses a date passed as a `DateModel` object and returns is as a formatted string with both the start and the end dates.
 */
export class DateParser {

  /**
   * Final date to be returned.
   */
  private finalDate: string;

  /**
   * Creates an instance of date parser.
   *
   * @param dateObject the dates to be displayed.
   * @param [lang] the current lang being processed.
   * @todo add in configuration an option to set the word for "present".
   */
  constructor(
    private dateObject: DateModel,
    private lang: string = 'en'
  ) { }

  /**
   * Initiates the logic to parse the date and returns the `finalData`
   */
  public parse(): string {
    this.checkObjProps();
    return this.finalDate;
  }

  /**
   * Checks what kind of dates have been passed. If it's a raw date, the date is returned "as is".
   * Else, the dates are parsed and localised.
   */
  private checkObjProps(): void {
    if (this.dateObject.raw)
      return this.setRaw();

    this.setStart();

    if (!this.dateObject.end)
      return;

    this.setEnd();

  }

  /**
   * Sets the `finalDate` as the `raw` date to return it "as is".
   */
  private setRaw(): void {
    this.finalDate = this.dateObject.raw;
  }

  /**
   * Sets the start date localized by `DateLocalizer`.
   */
  private setStart(): void {
    this.finalDate = new DateLocalizer(this.dateObject.start, this.lang).localize();
  }

  /**
   * Sets the end date or the word "present" if "-" is passed.
   */
  private setEnd(): void {

    this.finalDate += ' - ';

    this.finalDate += (this.dateObject.end === '-') ? '<span data-t="PRESENT"></span>' : new DateLocalizer(this.dateObject.end, this.lang).localize();

  }

}
