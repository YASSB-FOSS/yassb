import { existsSync, readFileSync } from 'fs';
import { builtinModules } from 'module';
import { resolve } from 'path';
import { DirectivesParser } from '../directives/directives-parser.class';
import { clearGeneratedPages } from '../directives/pages-generator/generated-pages.store';
import { DIAGNOSTICS, describeError, report } from '../diagnostics/diagnostics';
import { langsSetter } from '../i18n/langs-setter.function';
import { resetRenderersStore } from '../renderers/renderers-store.constant';
import { clearFileCache } from '../tools/file-cache';
import { clearFrontMatterStore } from '../tools/front-matter/front-matter-store.const';
import type { YassbConfig } from '../yassb';
import { loadConfig } from './load-config';
import { COMPILED_FILES, SourceCompileError } from './ts-require-hook';
import { workingDirSetter } from './working-dir-setter.function';
import { WORKING_DIR } from './working-dir.constant';

export interface SetupOptions {
  /** Replaces `workingDir.out` (absolute or relative to the project root). */
  outDir?: string;
  /** Create missing folders, as 1.x did. False for read-only commands. Default: true. */
  createDirs?: boolean;
}

export interface SetupResult {
  config: YassbConfig;
  /** Config files that were loaded, in merge order. */
  configFiles: Array<string>;
}

/** Thrown when the configuration cannot be loaded. The problem has already been reported as a diagnostic. */
export class ConfigLoadError extends Error { }

/**
 * Packages that 1.x installed as its own dependencies. Sites sometimes imported them without declaring them.
 */
export const FORMER_DEPENDENCIES = [
  'amd-loader', 'cheerio', 'clean-css', 'config', 'create-html-element', 'express', 'fs-extra', 'html-minifier',
  'lodash', 'moment', 'postcss-cli', 'react', 'react-dom', 'string-similarity', 'thread-loader', 'ts-loader',
  'ts-node', 'tslint', 'typescript', 'watch', 'webpack', 'ws', 'xml-sitemap'
];

/**
 * Clears every store of the previous run (languages, renderers, front matter, caches).
 */
export function resetBuildState(): void {
  clearFileCache();
  clearFrontMatterStore();
  clearGeneratedPages();
  DirectivesParser.frontMatterData = {};
  resetRenderersStore();
}

/**
 * Loads the configuration and prepares a run: folders (`WORKING_DIR`), languages (`LANGS`) and renderers.
 *
 * @returns the configuration, with `workingDir` replaced by the absolute paths of `WORKING_DIR`.
 * @throws ConfigLoadError if the configuration cannot be loaded (already reported).
 */
export function setupYassb(options: SetupOptions = {}): SetupResult {
  resetBuildState();

  let loaded;
  try {
    loaded = loadConfig(process.cwd());
  } catch (error) {
    reportConfigError(error);
    throw new ConfigLoadError('Configuration could not be loaded');
  }

  for (const file of loaded.skippedFiles)
    report({
      level: 'warning',
      code: 'CONFIG_UNSUPPORTED_FILE',
      message: `${file} was not loaded: YASSB 2 reads .ts, .js, .cjs and .json config files.`,
      file,
      hint: 'Convert it to .json or .ts.'
    });

  const config: YassbConfig = {
    workingDir: {},
    customRenderers: {},
    customDirectives: [],
    skipsStyles: false,
    postProcessors: [],
    htmlMinificationOptions: {},
    ...loaded.config
  };

  resetRenderersStore(config.customRenderers || {});

  const workingDir = { ...(config.workingDir || {}) };
  if (options.outDir)
    workingDir.out = resolve(process.cwd(), options.outDir);
  workingDirSetter(workingDir, false, options.createDirs !== false);
  langsSetter();

  config.workingDir = WORKING_DIR;
  DIAGNOSTICS.root = process.cwd();

  return { config, configFiles: loaded.files };
}

/**
 * Site files (TypeScript/JavaScript) loaded by the configuration, outside node_modules.
 * Used by `watch` to know which changes need a full rebuild, and by `check` for undeclared imports.
 */
export function loadedSiteModules(): Array<string> {
  const root = process.cwd();
  const files = new Set<string>(COMPILED_FILES);
  const cache = (require as NodeJS.Require).cache || {};
  for (const file of Object.keys(cache))
    files.add(file);
  return [...files].filter(file => file.startsWith(root) && !file.includes('node_modules'));
}

/**
 * Packages imported by site files but not declared in the site's package.json.
 */
export function undeclaredImports(files: Array<string>): Array<{ pkg: string; file: string }> {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath))
    return [];
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const declared = new Set<string>([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
    pkg.name,
    // Loaded by the CLI itself; if it were missing the configuration would not load at all.
    'yassb-web'
  ]);
  const builtins = new Set(builtinModules);
  const found: Array<{ pkg: string; file: string }> = [];
  const seen = new Set<string>();
  const pattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;
  for (const file of files) {
    if (!existsSync(file))
      continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:') || specifier.startsWith('bun:'))
        continue;
      const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      if (builtins.has(name) || declared.has(name) || seen.has(name))
        continue;
      seen.add(name);
      found.push({ pkg: name, file });
    }
  }
  return found;
}

function reportConfigError(error: unknown): void {
  if (error instanceof SourceCompileError) {
    report({
      level: 'error',
      code: 'CONFIG_LOAD_FAILED',
      fatal: true,
      file: resolve(process.cwd(), error.file),
      line: error.line,
      message: `Syntax error in site code: ${error.message}`,
      detail: error.lineText
    });
    return;
  }
  const { message, detail } = describeError(error);
  const missing = /Cannot find (?:module|package) '([^']+)'/.exec(message);
  if (missing) {
    const specifier = missing[1];
    const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    const former = FORMER_DEPENDENCIES.includes(name);
    report({
      level: 'error',
      code: 'CONFIG_MODULE_NOT_FOUND',
      fatal: true,
      message: `The configuration imports "${specifier}", which is not installed.`,
      hint: former
        ? `yassb-web 1.x installed "${name}" as its own dependency; 2.x does not. Add it to your site: npm install --save-dev ${name}`
        : `Install it in your site: npm install --save-dev ${name}`,
      detail
    });
    return;
  }
  report({ level: 'error', code: 'CONFIG_LOAD_FAILED', fatal: true, message: `The configuration could not be loaded: ${message}`, detail });
}
