import type { YassbConfig } from '../../yassb';
/* eslint-disable no-shadow */

/**
 * Names of the attributes of built-in directives.
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
 * Attributes of a directive: `options` is parsed JSON, every other value is a string.
 */
export interface DirectiveProps {
  [key: string]: string | { [key: string]: unknown } | Array<unknown>;
}

/** Problem found while reading the attributes of a directive. */
export interface DirectivePropsError {
  code: 'OPTIONS_INVALID_JSON';
  message: string;
}

/**
 * Reads the attributes of a directive, e.g.
 * `<!-- create-from-data-source="news.json" renderer="newsList" options="{"limit":3}" -->`.
 *
 * - `LANG` in the directive is replaced by the current language, `USERNAME` by `config.username` (as in 1.x);
 * - `options` holds JSON, written as is inside double (or single) quotes;
 * - other values are read up to the closing quote.
 */
export class DirectivePropsGetter {

  private props: DirectiveProps = {};

  /** Problems found by `parse()`. */
  public errors: Array<DirectivePropsError> = [];

  constructor(
    private directiveFullString: string,
    private config: YassbConfig,
    private lang?: string
  ) { }

  public parse(): DirectiveProps {
    if (this.lang)
      this.directiveFullString = this.directiveFullString.replace(/LANG/g, this.lang);
    this.directiveFullString = this.directiveFullString.replace(/USERNAME/g, String(this.config.username));
    this.readAttributes();
    return this.props;
  }

  private readAttributes(): void {
    const text = this.directiveFullString;
    const attribute = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])/g;
    let match: RegExpExecArray | null;
    while ((match = attribute.exec(text))) {
      const name = match[1];
      const quote = match[2];
      const valueStart = match.index + match[0].length;

      if (name === DirectivePropsKeys.options && (text[valueStart] === '{' || text[valueStart] === '[')) {
        const end = findJsonEnd(text, valueStart);
        const json = text.slice(valueStart, end);
        try {
          this.props.options = JSON.parse(json);
        } catch {
          this.errors.push({ code: 'OPTIONS_INVALID_JSON', message: `options are not valid JSON: ${json}` });
        }
        attribute.lastIndex = text[end] === quote ? end + 1 : end;
        continue;
      }

      const close = text.indexOf(quote, valueStart);
      const valueEnd = close < 0 ? text.length : close;
      this.props[name] = text.slice(valueStart, valueEnd);
      attribute.lastIndex = close < 0 ? text.length : close + 1;
    }
  }

}

/**
 * End of the JSON value starting at `start` (an object or array), honouring strings and nesting.
 */
function findJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === '\\')
        i++;
      else if (char === '"')
        inString = false;
      continue;
    }
    if (char === '"')
      inString = true;
    else if (char === '{' || char === '[')
      depth++;
    else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0)
        return i + 1;
    }
  }
  return text.length;
}
