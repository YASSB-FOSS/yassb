import { OptionsKeys } from '@yassb/config/options-keys.enum';
import config from 'config';
import { GrayMatterFile, GrayMatterOption, read } from 'gray-matter';
import { Converter, ConverterOptions } from 'showdown';

/**
 * Information on a file to be injected as the source file or as a component.
 */
export interface ParsedFile {
  content: string;
  data: GrayMatterFile<string>['data'];
}

/**
 * Analyzes a text only file, including MarkDown files, and parses it to HTML.
 */
export class TextFormatterParser {

  /**
   * The metadata contiained in the source file as extracted by `gray-matter`.
   */
  private parsedContent: GrayMatterFile<string>;
  /**
   * Content of the file formatted as HTML.
   */
  private content: string;

  /**
   * Creates an instance of text formatter parser.
   *
   * @param pathToFile path to the file to read and format as HTML.
   */
  constructor(
    private pathToFile: string
  ) { }

  /**
   * Checks if the file exists. If not returns a error. Else parses it.
   * Conversion to HTML is done with Showdown, while Front Matter data extraction is done with `gray-matter`.
   *
   * @returns do
   */
  public do(): ParsedFile {
    this.setParsedContent();

    if (!this.parsedContent.content)
      console.warn(`WARNING: Empty file, nothing to inject in template from ${this.pathToFile}`);

    let showdownOptions: ConverterOptions = { tables: true };
    if (config.has(OptionsKeys.showdownConverterOptions))
      showdownOptions = config.get(OptionsKeys.showdownConverterOptions);

    this.content = new Converter(showdownOptions).makeHtml(this.parsedContent.content);

    if (this.parsedContent.data && !this.parsedContent.data.excerpt && this.parsedContent.excerpt)
      this.parsedContent.data.excerpt = this.parsedContent.excerpt;

    if (this.parsedContent.data && !this.parsedContent.data.language && this.parsedContent.language)
      this.parsedContent.data.language = this.parsedContent.language;

    return { content: this.content, data: this.parsedContent.data };
  }

  /**
   * Reads the file with `gray-matter` to seaprate the Front Matter data from the actual cotnents of the file.
   */
  private setParsedContent(): void {
    let grayMatterOptions: GrayMatterOption<string, unknown>;
    if (config.has(OptionsKeys.grayMatterOption))
      grayMatterOptions = config.get(OptionsKeys.grayMatterOption);
    this.parsedContent = read(this.pathToFile, grayMatterOptions);
  }

}
