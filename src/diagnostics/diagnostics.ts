import { existsSync, readFileSync } from 'fs';
import { relative } from 'path';

/**
 * Problems found while loading, building or checking a project.
 *
 * Every problem has a stable `code` (listed in `DIAGNOSTIC_CODES`), a message, and when possible the source file
 * and line. They are printed as they happen and collected, so that `yassb check`, `--json` output and the watch
 * overlay can show them.
 *
 * - `fatal`: the problem made 1.x crash, so the build still exits with code 1.
 * - other errors only make the build fail with `strict: true` / `--strict` (1.x only logged them).
 */
export type DiagnosticLevel = 'error' | 'warning' | 'info';

export interface Diagnostic {
  level: DiagnosticLevel;
  /** Stable identifier, e.g. `DATA_SOURCE_NOT_FOUND`. */
  code: string;
  message: string;
  /** Source file, relative to the project root when inside it. */
  file?: string;
  /** 1-based line in `file`. */
  line?: number;
  /** How to fix it. */
  hint?: string;
  /** The directive text involved, if any. */
  directive?: string;
  /** Stack trace or extra details. */
  detail?: string;
  /** True if the problem stops the build with exit code 1 even without `strict`. */
  fatal?: boolean;
  /** Collected but not printed while building (summarised instead). */
  quiet?: boolean;
}

/** Every code YASSB can report, with what it means. Printed by `yassb docs diagnostics`. */
export const DIAGNOSTIC_CODES: { [code: string]: string } = {
  CONFIG_LOAD_FAILED: 'The configuration (config/*.ts|js|json) or a module it imports threw while loading.',
  CONFIG_MODULE_NOT_FOUND: 'The configuration imports a package that is not installed in the site.',
  CONFIG_UNSUPPORTED_FILE: 'A config file has a format YASSB 2 does not read (yaml, toml, …).',
  UNDECLARED_DEPENDENCY: 'Site code imports a package missing from package.json (it may work only by accident).',
  COMPONENT_NOT_FOUND: 'A `component` directive points to a file that does not exist.',
  COMPONENT_UNSUPPORTED_FORMAT: 'A `component` directive points to a file type that cannot be included.',
  COMPONENT_CYCLE: 'Components include each other endlessly.',
  DATA_SOURCE_MISSING_NAME: '`create-from-data-source` has no file name.',
  DATA_SOURCE_NOT_FOUND: '`create-from-data-source` points to a JSON file that does not exist.',
  DATA_SOURCE_INVALID_JSON: 'A data source is not valid JSON.',
  OPTIONS_INVALID_JSON: 'The `options` attribute of a directive is not valid JSON.',
  RENDERER_MISSING: 'A directive has no `renderer` attribute; `basicElement` is used.',
  RENDERER_NOT_FOUND: 'The renderer named in a directive is not registered in `customRenderers`.',
  RENDERER_FAILED: 'A renderer threw an exception.',
  DIRECTIVE_NO_REGEX: 'A custom directive class has no static `regex`.',
  DIRECTIVE_FAILED: 'A custom directive threw an exception or returned no HTML.',
  DIRECTIVE_UNPROCESSED: 'A directive is still in the page after processing; its content is missing.',
  URL_TO_EMPTY: '`url-to` has no value.',
  URL_TO_NOT_FOUND: '`url-to` matches no file of the site.',
  URL_TO_AMBIGUOUS: '`url-to` matches several files; the closest one is used.',
  PUBLIC_FILE_LIST_RENDERER_NOT_FOUND: '`public-file-list` needs a renderer registered in `customRenderers`.',
  PUBLIC_FILE_LIST_NOT_FOUND: '`public-file-list` points to a folder that does not exist in the output.',
  TEMPLATE_NO_DIRECTIVE: 'A file in pages-to-generate has no `generate-from-files` directive.',
  TEMPLATE_SOURCE_NOT_FOUND: 'The folder of a `generate-from-files` directive does not exist.',
  MARKDOWN_EMPTY: 'A Markdown/text file used to generate a page is empty.',
  FRONT_MATTER_INVALID_DATE: 'A `date` front matter value is not a valid date.',
  I18N_MISSING_KEY: 'A translation key is used in a page but missing in a language file.',
  I18N_INVALID_FILE: 'A language file in the i18n folder is not valid JSON.',
  I18N_UNCLOSED_ELEMENT: 'An element with `data-t` has no closing tag, so it was not translated.',
  I18N_UNTRANSLATED_ATTRIBUTE: 'A `data-t`/`data-attr-t` attribute is left in the output.',
  I18N_UNUSED_KEY: 'A translation key is never used in the sources (it may be used by code).',
  I18N_INCONSISTENT_KEYS: 'A translation key exists in some languages but not in others.',
  POST_PROCESSOR_FAILED: 'A post processor threw an exception.',
  HOOK_FAILED: 'A beforeBuild/afterBuild hook threw an exception.',
  BUILD_CRASHED: 'The build process stopped unexpectedly (watch mode keeps serving the last output).',
  MINIFY_FAILED: 'The HTML minifier could not parse a page; the page was written unminified.',
  STYLES_FAILED: 'The stylesheet could not be compiled.',
  SCRIPTS_FAILED: 'The scripts could not be bundled.',
  LINK_BROKEN: 'A page links to a local file that is not in the output.',
  UNUSED_COMPONENT: 'A component is not used by any page.',
  UNUSED_DATA_SOURCE: 'A data source is not used by any page.'
};

/**
 * Collects diagnostics for the current run. One instance per process (a build runs in its own process in watch mode).
 */
export class DiagnosticsCollector {

  private items: Array<Diagnostic> = [];
  private seen = new Set<string>();

  /** Root used to print relative paths. */
  public root = process.cwd();

  /** When true, diagnostics are not printed as they are reported. */
  public silent = false;

  public reset(): void {
    this.items = [];
    this.seen.clear();
  }

  /**
   * Records a diagnostic and prints it. The same problem reported twice (for example once for a component and
   * once for the page including it) is kept only once.
   */
  public report(diagnostic: Diagnostic): void {
    if (diagnostic.file)
      diagnostic.file = this.relativize(diagnostic.file);
    const key = [diagnostic.code, diagnostic.directive || diagnostic.file, diagnostic.directive ? '' : diagnostic.line, diagnostic.message].join('|');
    if (this.seen.has(key))
      return;
    // A directive left in a page is a consequence of a problem already reported for it.
    if (diagnostic.code === 'DIRECTIVE_UNPROCESSED' && this.items.some(item => item.directive === diagnostic.directive))
      return;
    this.seen.add(key);
    this.items.push(diagnostic);
    if (!this.silent && !diagnostic.quiet)
      printDiagnostic(diagnostic);
  }

  public all(): Array<Diagnostic> {
    return [...this.items];
  }

  public errors(): Array<Diagnostic> {
    return this.items.filter(item => item.level === 'error');
  }

  public warnings(): Array<Diagnostic> {
    return this.items.filter(item => item.level === 'warning');
  }

  public hasFatal(): boolean {
    return this.items.some(item => item.fatal);
  }

  private relativize(file: string): string {
    const rel = relative(this.root, file);
    return rel.startsWith('..') ? file : rel.split('\\').join('/');
  }

}

/** Diagnostics of the current process. */
export const DIAGNOSTICS = new DiagnosticsCollector();

/** Shortcut for `DIAGNOSTICS.report`. */
export function report(diagnostic: Diagnostic): void {
  DIAGNOSTICS.report(diagnostic);
}

/** Formats a diagnostic on one line (plus hint), e.g. `error DATA_SOURCE_NOT_FOUND src/app/pages/index.html:12 …`. */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const where = diagnostic.file ? ` ${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ''}` : '';
  let text = `${diagnostic.level} ${diagnostic.code}${where}\n  ${diagnostic.message}`;
  if (diagnostic.hint)
    text += `\n  hint: ${diagnostic.hint}`;
  return text;
}

function printDiagnostic(diagnostic: Diagnostic): void {
  const text = formatDiagnostic(diagnostic);
  if (diagnostic.level === 'info')
    console.log(text);
  else
    console.error(text);
  if (diagnostic.detail && diagnostic.level === 'error')
    console.error(indent(diagnostic.detail));
}

function indent(text: string): string {
  return text.split('\n').map(line => `    ${line}`).join('\n');
}

const sourceCache = new Map<string, string>();

/**
 * Finds the 1-based line of `needle` in `file`. Returns undefined when the file or the text cannot be found.
 */
export function lineOf(file: string | undefined, needle: string | undefined): number | undefined {
  if (!file || !needle)
    return undefined;
  let text = sourceCache.get(file);
  if (text === undefined) {
    text = existsSync(file) ? readFileSync(file, 'utf8') : '';
    sourceCache.set(file, text);
  }
  const index = text.indexOf(needle);
  if (index < 0)
    return undefined;
  let line = 1;
  for (let i = 0; i < index; i++)
    if (text.charCodeAt(i) === 10)
      line++;
  return line;
}

/** Text and stack of an exception thrown by site code. */
export function describeError(error: unknown): { message: string; detail?: string } {
  if (error instanceof Error)
    return { message: error.message, detail: error.stack };
  return { message: String(error) };
}
