import { FrontMatterData } from '@yassb/tools/front-matter/front-matter-store.const';

/**
 * Injects Front Matter data into the contents of a file by analyzing where a data key is found in content between curly brackets.
 */
export class FrontMatterInjector {

  /**
   * Creates an instance of front matter injector.
   *
   * @param contents the contents of the file where to look for insert commanda.
   * @param data the full Front Matter data of the file to be inserted.
   */
  constructor(
    private contents: string,
    private data: FrontMatterData
  ) { }

  /**
   * Starts the logic of front matter injector.
   * For each `key` in `data` calls `injectDataValues`.
   *
   * @returns the contents of the file as updated with the injected data.
   */
  public inject(): string {
    for (const key in this.data)
      this.injectDataValues(key, this.data[key]);

    return this.contents;
  }

  /**
   * Injects data values into content by matching the regexp formed by each `key` of `data` between tcurly brackets.
   *
   * @param identifier the key of the data to look for.
   * @param value the value to be injected.
   */
  private injectDataValues(identifier: string, value: string | Object | Array<any>): void {
    const searchTerm = `{ ${identifier} }`;
    const stringifiedValue = this.stingify(value, identifier);
    this.contents = this.contents.replace(new RegExp(searchTerm, 'g'), stringifiedValue);
  }

  /**
   * Converts non string Front Matter data values to strings with JSON stringify.
   *
   * @param value the value to check and eventually convert.
   * @param identifier the key of the data.
   * @returns the value as a string.
   */
  private stingify(value: string | Object | Array<unknown>, identifier: string): string {

    if (identifier === 'date')
      return new Date(value as string).toLocaleDateString(); // TODO with i18n

    switch (typeof value) {
      case 'string':
        return value;
      default:
        return JSON.stringify(value);
    }
  }

}
