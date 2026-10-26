import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { describeError, report } from '../../diagnostics/diagnostics';
import type { YassbConfig } from '../../yassb';
import { assetsFileNameMaker } from '../assets-file-name-maker.function';

/** Bundled JavaScript, ready to be written. */
export interface ScriptsBundle {
  /** Writes the bundle to `scriptsOutFolder`. */
  write(): void;
  /** Absolute paths of the files that went into the bundle. */
  inputs: Array<string>;
}

/**
 * Bundles `workingDir.scripts` (default `src/app/scripts/main.ts`) for the browser with esbuild:
 * IIFE, minified (not in watch mode), `process.env.NODE_ENV` = `"production"`, the site's tsconfig for JSX.
 * The result is kept in memory and written at the end of the build.
 *
 * A legacy `webpackConfig` is run with the site's own webpack instead.
 */
export async function bundleScripts(config: YassbConfig, watchMode: boolean): Promise<ScriptsBundle | undefined> {
  mkdirSync(WORKING_DIR.scriptsOutFolder, { recursive: true });
  const filename = assetsFileNameMaker('scripts');

  if (config.webpackConfig)
    return runWebpack(config.webpackConfig);

  const esbuild = require('esbuild') as typeof import('esbuild');
  const outfile = resolve(WORKING_DIR.scriptsOutFolder, filename);
  try {
    const result = await esbuild.build({
      entryPoints: [WORKING_DIR.scripts],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      target: 'es2018',
      minify: !watchMode,
      sourcemap: watchMode ? 'inline' : false,
      metafile: true,
      logLevel: 'silent',
      absWorkingDir: process.cwd(),
      outfile,
      define: { 'process.env.NODE_ENV': '"production"' },
      ...(config.esbuildOptions || {})
    });
    for (const warning of result.warnings)
      report(fromEsbuildMessage(warning, 'warning'));
    const output = result.outputFiles.find(file => file.path.endsWith('.js')) || result.outputFiles[0];
    const inputs = Object.keys(result.metafile ? result.metafile.inputs : {}).map(input => resolve(process.cwd(), input));
    return {
      inputs,
      write: () => {
        if (output)
          writeFileSync(outfile, output.contents);
      }
    };
  } catch (error) {
    const failure = error as { errors?: Array<import('esbuild').Message> };
    if (failure.errors && failure.errors.length)
      failure.errors.forEach(message => report(fromEsbuildMessage(message, 'error')));
    else
      report({ level: 'error', code: 'SCRIPTS_FAILED', message: `Scripts could not be bundled: ${describeError(error).message}`, detail: describeError(error).detail });
    return undefined;
  }
}

function fromEsbuildMessage(message: import('esbuild').Message, level: 'error' | 'warning') {
  return {
    level,
    code: 'SCRIPTS_FAILED',
    message: message.text,
    file: message.location ? resolve(process.cwd(), message.location.file) : undefined,
    line: message.location ? message.location.line : undefined,
    hint: message.notes && message.notes.length ? message.notes.map(note => note.text).join(' ') : undefined
  };
}

function runWebpack(webpackConfig: object): Promise<ScriptsBundle | undefined> {
  let webpack: (configs: Array<object>, callback: (error: Error | null, stats: any) => void) => void;
  try {
    webpack = createRequire(resolve(process.cwd(), 'package.json'))('webpack');
  } catch {
    report({
      level: 'error',
      code: 'SCRIPTS_FAILED',
      message: '`webpackConfig` is set but webpack is not installed in the site.',
      hint: 'Install it (npm install --save-dev webpack ts-loader), or remove webpackConfig to use the built-in esbuild bundler.'
    });
    return Promise.resolve(undefined);
  }
  return new Promise(resolvePromise => {
    webpack([webpackConfig], (error, stats) => {
      if (error)
        report({ level: 'error', code: 'SCRIPTS_FAILED', message: `webpack: ${error.message}` });
      const json = stats?.toJson?.();
      for (const item of json?.errors || [])
        report({ level: 'error', code: 'SCRIPTS_FAILED', message: `webpack: ${typeof item === 'string' ? item : item.message}` });
      resolvePromise({ inputs: [], write: () => undefined });
    });
  });
}
