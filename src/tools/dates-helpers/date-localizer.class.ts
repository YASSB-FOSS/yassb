/**
 * Formats a date written as `YYYY`, `YYYY/MM` or `YYYY/MM/DD` in a language, with the built-in `Intl` API
 * (1.x used moment with the same formats: `LL` for full dates, `MMMM YYYY` for months).
 *
 * - `2020` → `2020`
 * - `2020/03` → `March 2020` (en), `marzo 2020` (it)
 * - `2020/03/05` → `March 5, 2020` (en), `5 marzo 2020` (it)
 *
 * @featurePart renderer.liDateDescription
 */
export class DateLocalizer {

  constructor(
    private dateString: string,
    private lang: string = 'en'
  ) { }

  public localize(): string {
    const parts = String(this.dateString).split('/');
    if (parts.length === 1)
      return parts[0];

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
    const date = new Date(Date.UTC(year, month, day, 12));
    const locale = safeLocale(this.lang);

    if (parts.length >= 3)
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);

    const monthName = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(date);
    return `${monthName} ${year}`;
  }

}

function safeLocale(lang: string): string {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : 'en';
  } catch {
    return 'en';
  }
}
