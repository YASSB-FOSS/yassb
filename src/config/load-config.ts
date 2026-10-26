import { existsSync, readdirSync, readFileSync } from 'fs';
import { hostname } from 'os';
import { delimiter, resolve } from 'path';
import type { YassbConfig } from '../yassb';
import { installTsRequireHook } from './ts-require-hook';

/**
 * Loads the configuration from the `config` folder, with the same rules as the `config` npm package used by 1.x:
 *
 * - folder: `$NODE_CONFIG_DIR` (several folders separated by `:`), else `./config`;
 * - files, merged in this order: `default`, `{deployment}`, `{hostname}`, `{hostname}-{deployment}`,
 *   `local`, `local-{deployment}`, each also as `{name}-{NODE_APP_INSTANCE}`;
 *   deployment is `$NODE_CONFIG_ENV`, else `$NODE_ENV`, else `development`;
 * - extensions: `.js`, `.cjs`, `.ts`, `.cts`, `.mts`, `.tsx`, `.json`;
 * - `$NODE_CONFIG` (JSON) is merged last.
 *
 * Objects are merged deeply; arrays, functions and classes are replaced.
 */

const EXTENSIONS = ['js', 'cjs', 'ts', 'cts', 'mts', 'tsx', 'json'];
const UNSUPPORTED_EXTENSIONS = ['json5', 'hjson', 'toml', 'coffee', 'iced', 'yaml', 'yml', 'cson', 'properties', 'xml'];

/**
 * @internal
 */
export interface LoadedConfig {
  config: YassbConfig;
  /** Absolute paths of the files that were merged, in order. */
  files: Array<string>;
  /** Config files found but not loaded (unsupported formats). */
  skippedFiles: Array<string>;
}

/**
 * @feature config.files
 * @summary The configuration is read from config/ with the rules of the config npm package.
 * @usage config/default.ts → export default { ... } as YassbConfig; config/production.ts merged when NODE_ENV=production.
 * @options NODE_CONFIG_DIR (folder, several separated by :), NODE_CONFIG_ENV / NODE_ENV (deployment, default development), NODE_APP_INSTANCE, HOST/HOSTNAME, NODE_CONFIG (JSON merged last).
 * @rules Files merged in order: default, {deployment}, {host}, {host}-{deployment}, local, local-{deployment}, each also as {name}-{instance}; extensions .js .cjs .ts .cts .mts .tsx .json; export default or module.exports; plain objects are merged deeply, arrays/functions/classes replaced; YAML/TOML/other formats are reported and skipped; a missing package imported by the config is explained (packages yassb-web 1.x used to install are named).
 * @errors CONFIG_LOAD_FAILED, CONFIG_MODULE_NOT_FOUND, CONFIG_UNSUPPORTED_FILE
 * @status stable
 * @since 1.0.0
 * @related api.define-config, behaviour.site-code
 */
export function loadConfig(cwd: string = process.cwd()): LoadedConfig {
  const dirs = configDirs(cwd);
  const names = configFileNames();
  const files: Array<string> = [];
  const skippedFiles: Array<string> = [];
  const config: { [key: string]: unknown } = {};

  for (const dir of dirs) {
    if (!existsSync(dir))
      continue;
    const present = new Set(readdirSync(dir));
    for (const name of names) {
      for (const extension of EXTENSIONS) {
        const fileName = `${name}.${extension}`;
        if (!present.has(fileName))
          continue;
        const file = resolve(dir, fileName);
        mergeDeep(config, readConfigFile(file));
        files.push(file);
      }
      for (const extension of UNSUPPORTED_EXTENSIONS)
        if (present.has(`${name}.${extension}`))
          skippedFiles.push(resolve(dir, `${name}.${extension}`));
    }
  }

  if (process.env.NODE_CONFIG)
    mergeDeep(config, JSON.parse(process.env.NODE_CONFIG));

  return { config: config as YassbConfig, files, skippedFiles };
}

function configDirs(cwd: string): Array<string> {
  const fromEnv = process.env.NODE_CONFIG_DIR;
  if (!fromEnv)
    return [resolve(cwd, 'config')];
  return fromEnv.split(delimiter).filter(Boolean).map(dir => resolve(cwd, dir));
}

/** Base names in merge order, already expanded with the app instance. */
function configFileNames(): Array<string> {
  const deployments = (process.env.NODE_CONFIG_ENV || process.env.NODE_ENV || 'development').split(',').map(env => env.trim()).filter(Boolean);
  const instance = process.env.NODE_APP_INSTANCE;
  const host = process.env.HOST || process.env.HOSTNAME || safeHostname();

  const baseNames = ['default', ...deployments];
  if (host) {
    const shortHost = host.split('.')[0];
    for (const deployment of deployments) {
      baseNames.push(shortHost, `${shortHost}-${deployment}`);
      if (host !== shortHost)
        baseNames.push(host, `${host}-${deployment}`);
    }
  }
  for (const deployment of deployments)
    baseNames.push('local', `local-${deployment}`);

  const names: Array<string> = [];
  for (const baseName of baseNames) {
    if (!names.includes(baseName))
      names.push(baseName);
    if (instance && !names.includes(`${baseName}-${instance}`))
      names.push(`${baseName}-${instance}`);
  }
  return names;
}

function safeHostname(): string | undefined {
  try {
    return hostname();
  } catch {
    return undefined;
  }
}

function readConfigFile(file: string): unknown {
  if (file.endsWith('.json'))
    return JSON.parse(stripBom(readFileSync(file, 'utf8')));
  installTsRequireHook();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require(file);
  // Like the `config` package: `export default {...}` is read from `default`.
  return loaded && loaded.default ? loaded.default : loaded;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function isPlainObject(value: unknown): value is { [key: string]: unknown } {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep merge of plain objects; any other value replaces the previous one.
 *
 * @internal
 */
export function mergeDeep(target: { [key: string]: unknown }, source: unknown): { [key: string]: unknown } {
  if (!isPlainObject(source))
    return target;
  for (const key of Object.keys(source)) {
    const value = source[key];
    const current = target[key];
    if (isPlainObject(value) && isPlainObject(current))
      mergeDeep(current, value);
    else if (isPlainObject(value))
      target[key] = mergeDeep({}, value);
    else
      target[key] = value;
  }
  return target;
}
