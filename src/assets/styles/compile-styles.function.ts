import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { describeError, report } from '../../diagnostics/diagnostics';
import type { YassbConfig } from '../../yassb';
import { assetsFileNameMaker } from '../assets-file-name-maker.function';

/** Result of the styles step. */
export interface StylesResult {
  /** Absolute paths of the stylesheets that were read (Sass only). */
  inputs: Array<string>;
}

/**
 * Compiles `workingDir.styles` and writes `<name>-<version>.min.css` to `stylesOutFolder`.
 *
 * - default: Sass, compressed; imports are resolved from the file, then from the project root (as 1.x did);
 * - `config.stylesParser`: the site's own compiler (e.g. Tailwind), called with the source and destination paths.
 */
export async function compileStyles(config: YassbConfig): Promise<StylesResult> {
  mkdirSync(WORKING_DIR.stylesOutFolder, { recursive: true });
  const pathToStyle = resolve(WORKING_DIR.styles);
  const pathToFinalCss = resolve(WORKING_DIR.stylesOutFolder, assetsFileNameMaker('styles'));

  if (config.stylesParser) {
    try {
      const css = await config.stylesParser(pathToStyle, pathToStyle, pathToFinalCss);
      writeFileSync(pathToFinalCss, css);
    } catch (error) {
      const { message, detail } = describeError(error);
      report({ level: 'error', code: 'STYLES_FAILED', fatal: true, file: pathToStyle, message: `stylesParser failed: ${message}`, detail });
    }
    return { inputs: [] };
  }

  const sass = require('sass') as typeof import('sass');
  try {
    const result = sass.compile(pathToStyle, {
      style: 'compressed',
      loadPaths: [process.cwd()],
      quietDeps: true
    });
    writeFileSync(pathToFinalCss, result.css);
    return { inputs: result.loadedUrls.filter(url => url.protocol === 'file:').map(url => fileURLToPath(url)) };
  } catch (error) {
    const failure = error as { sassMessage?: string; span?: { url?: URL; start?: { line: number } } };
    report({
      level: 'error',
      code: 'STYLES_FAILED',
      fatal: true,
      file: failure.span?.url ? fileURLToPath(failure.span.url) : pathToStyle,
      line: failure.span?.start ? failure.span.start.line + 1 : undefined,
      message: `Sass: ${failure.sassMessage || describeError(error).message}`
    });
    return { inputs: [pathToStyle] };
  }
}
