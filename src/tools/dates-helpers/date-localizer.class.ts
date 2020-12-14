import moment from 'moment';

/**
 * Localazes date to a given locale.
 */
export class DateLocalizer {

  /**
   * The localized and formatted date.
   */
  private localDate: string;
  /**
   * The date splitted in an Array
   */
  private dateArr: Array<string>;
  /**
   * The formats to use to format the localized date.
   */
  private format: 'LL' | 'MMMM YYYY';

  /**
   * Creates an instance of date localizer.
   *
   * @param dateString the string of the date to localize. The format expected is YYYY | YYYY/MM | YYYY/MM/DD.
   * @param [lang] the locale in which to localize the date. Defaults to `en` for website without any localization.
   * @todo define in configuration the defaul locale.
   */
  constructor(
    private dateString: string,
    private lang: string = 'en'
  ) { }

  /**
   * Starts the localization logic.
   */
  public localize(): string {
    this.stringToArr();
    this.analyzeDate();
    return this.localDate;
  }

  /**
   * Splits the date by the forward slash.
   * The first element of the Array will be the Year, the second the Month, the third the day.
   */
  private stringToArr(): void {
    this.dateArr = this.dateString.split('/');
  }

  /**
   * Analyzes date to determine how many info have been passed (YYYY | YYYY/MM | YYYY/MM/DD).
   * If only the year was passed, the localization can end here as the is no actual formatting to do.
   */
  private analyzeDate(): void {
    if (this.dateArr.length === 1)
      return this.setYearOnly();

    this.processCompolex();
  }

  /**
   * Sets the year on the final `localDate` to return.
   */
  private setYearOnly(): void {
    this.localDate = this.dateArr[0];
  }

  /**
   * Processe situazions in which we also have the month or month and day.
   * It calls `setFormat` to determine if the final date should have the day or not.
   * After, if the day was not passed, it calls `addDay` to add the day value as we cannot work on a partial date.
   * This will not be shown as we have already set a formatting that does not show the day if the user passed a date without the day.
   */
  private processCompolex(): void {
    this.setLocale();
    this.setFormat();
    if (this.dateArr.length === 2)
      this.addDay();
    this.setFullDate();
  }

  /**
   * Sets the locale on `moment`.
   */
  private setLocale(): void {
    moment.locale(this.lang);
  }

  /**
   * Sets the formatting for the `localDate` to return.
   * If no day was passed, a format without day is set. Else, a full date format is set.
   */
  private setFormat(): void {
    this.format = (this.dateArr.length === 3) ? 'LL' : 'MMMM YYYY';
  }

  /**
   * Adds day to properly work with the string as a date where the user did not provide one.
   * Since we don't care about the day anyways, the first of them onth is added.
   */
  private addDay(): void {
    this.dateString += '/01';
    this.dateArr.push('01');
  }

  /**
   * Sets the full date by year, month and day on `moment` and formats it.
   */
  private setFullDate(): void {
    const year = parseInt(this.dateArr[0], 10);
    const month = parseInt(this.dateArr[1], 10) - 1;
    const day = parseInt(this.dateArr[2], 10);
    this.localDate = moment()
      .year(year)
      .month(month)
      .date(day)
      .format(this.format);
  }

}
