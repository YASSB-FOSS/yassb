import { report } from '../../diagnostics/diagnostics';
import { replaceAllLiteral } from '../../directives/tools/extract-directives.function';
import type { FrontMatterData } from './front-matter-store.const';

/**
 * Replaces `{ key }` placeholders (one space inside each brace) with front matter values.
 * Strings are inserted as they are, dates (and the `date` key) as ISO strings, other values as JSON.
 *
 * @feature content.front-matter
 * @summary { key } placeholders are replaced with front matter values.
 * @usage ---\ntitle: Hello\ndate: 2024-01-15\n---  then <title>{ title }</title>
 * @options none
 * @rules One space inside each brace; values come from Markdown files, components with front matter and the data returned by custom directives; strings inserted as they are (not escaped), dates and the date key as ISO strings, other values as JSON; replaced after components and again in post-processing.
 * @errors FRONT_MATTER_INVALID_DATE
 * @status stable
 * @since 1.0.0
 * @related content.markdown, api.custom-directives
 */
export class FrontMatterInjector {

  constructor(
    private contents: string,
    private data: FrontMatterData,
    private fileForReports?: string
  ) { }

  public inject(): string {
    for (const key in this.data)
      this.injectDataValues(key, this.data[key]);

    return this.contents;
  }

  private injectDataValues(identifier: string, value: unknown): void {
    const searchTerm = `{ ${identifier} }`;
    if (!this.contents.includes(searchTerm))
      return;
    this.contents = replaceAllLiteral(this.contents, searchTerm, this.stringify(value, identifier));
  }

  private stringify(value: unknown, identifier: string): string {
    if (value instanceof Date)
      return value.toISOString();

    if (identifier === 'date') {
      const date = new Date(value as string);
      if (Number.isNaN(date.getTime())) {
        report({
          level: 'error',
          code: 'FRONT_MATTER_INVALID_DATE',
          file: this.fileForReports,
          message: `Front matter "date" is not a valid date: ${JSON.stringify(value)}. It was inserted as it is.`
        });
        return String(value);
      }
      return date.toISOString();
    }

    return typeof value === 'string' ? value : String(JSON.stringify(value));
  }

}
