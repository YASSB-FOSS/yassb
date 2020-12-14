import { isValidJsonString } from '@yassb/tools/is-valid-json-string.function';
import { YassbConfig } from '@yassb/yassb';
/* eslint-disable no-shadow */

/**
 * Quick reference of some of the attributes of built-in directives.
 * The list is used to avoid typos, it is not exhaustive. It does not need to contain all possible attributes names.
 */
export enum DirectivePropsKeys {
  component = 'component',
  'create-from-data-source' = 'create-from-data-source',
  renderer = 'renderer',
  'generate-from-files' = 'generate-from-files',
  'public-file-list' = 'public-file-list',
  options = 'options'
}

/**
 * Type of values that might be retrieved from an attribute of a directive
 */
export interface DirectiveProps {
  [key: string]: string | { [key: string]: unknown } | Array<unknown>;
}

/**
 * Analyzes a YASSB formatted HTML comment and extracts the relevant attributes and values
 */
export class DirectivePropsGetter {

  /**
   * Object whose keys are the attribute names found in the directive and the values the content of the attributes.
   */
  private props: DirectiveProps = {};

  /**
   * Creates an instance of directive props getter.
   *
   * @param directiveFullString the full text of the directive previously found with a `RegExp`.
   * @param config the full YASSV configuration object
   * @param [lang] the current language being processed if i18n is enabled
   */
  constructor(
    private directiveFullString: string,
    private config: YassbConfig,
    private lang?: string
  ) { }

  /**
   * Executes the whole logic to extract all properties and values from the directive.
   *
   * @returns parse
   */
  public parse(): DirectiveProps {
    if (this.lang)
      this.replaceLang();
    this.replaceUsername();
    this.getOptions();
    this.matchDirectiveProps();
    return this.props;
  }

  /**
   * Replaces any occurance of `LANG` with the current lang, if i18n is enabled
   */
  private replaceLang(): void {
    this.directiveFullString = this.directiveFullString.replace(/LANG/g, this.lang);
  }

  /**
   * Replaces any occurance of `USERNAME` in the directive string with the value set in YASSB config
   */
  private replaceUsername(): void {
    this.directiveFullString = this.directiveFullString.replace(/USERNAME/g, this.config.username);
  }

  /**
   * Matches anything between the external quotes of the `options` attribute and then removes options from the directiveFullString.
   */
  private getOptions(): void {
    if (!this.directiveFullString.includes('options="'))
      return;

    const optionsString = this.directiveFullString.match(/(?<=options=")[{[].*(?=")/g)[0];
    this.directiveFullString = this.directiveFullString.replace(optionsString, '').replace('options="', '');
    if (isValidJsonString(optionsString))
      this.props['options'] = JSON.parse(optionsString);
    else
      console.error(`ERROR: Options are not a valid JSON string in directive ${this.directiveFullString}`);
  }

  /**
   * Matches each attribute and value in the directive without the closing quote (").
   * Then splits the string by `="` to separate the attribute from the value.
   * Checks if the attribute is a supported attribute. If so, adds it to the props, else throws an error in console.
   */
  private matchDirectiveProps(): void {
    const arrPropsValues = this.directiveFullString.match(/[a-zA-Z-]*={1}"{1}[\\/a-zA-Z0-9\s.,;:`üöïëäÄËÏÖÜçáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙ()\][{}_\-^<>@#£$%§°&?^!|§€-]*/g);
    if (arrPropsValues)
      arrPropsValues.forEach(propValue => {
        const arrPropValue = propValue.split('="');
        this.props[arrPropValue[0]] = arrPropValue[1];
      });
  }

}
