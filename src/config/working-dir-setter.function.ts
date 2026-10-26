import { closeSync, existsSync, mkdirSync, openSync } from 'fs';
import { dirname, resolve } from 'path';
import type { WorkingDirConfig } from '../yassb';
import { WORKING_DIR } from './working-dir.constant';

/**
 * Sets `WORKING_DIR` from the defaults and the values of the configuration, and creates missing folders
 * (and empty scripts/styles entry files), as 1.x did.
 *
 * @param workingDir the `workingDir` option of the configuration.
 * @param skipOut skip the creation of the `out` folders (used by `yassb new`).
 * @param createDirs create missing folders and entry files (false for read-only commands such as `inspect`).
 */
export function workingDirSetter(workingDir: Partial<WorkingDirConfig> = {}, skipOut: boolean = false, createDirs: boolean = true): void {
  const base = workingDir.base ? resolve(process.cwd(), workingDir.base) : process.cwd();
  const src = workingDir.src || 'src';
  const assets = workingDir.assets || 'assets';
  const i18n = workingDir.i18n || 'i18n';
  const app = workingDir.app || 'app';
  const pages = workingDir.pages || 'pages';
  const posts = workingDir.posts || '';
  const components = workingDir.components || 'components';
  const dataSources = workingDir.dataSources || 'data-sources';
  const pagesToGenerate = workingDir.pagesToGenerate || 'pages-to-generate';
  const out = workingDir.out || 'dist/public';

  const scripts = workingDir.scripts || 'scripts/main.ts';
  const scriptsOutFolder = workingDir.scriptsOutFolder || 'assets/js';

  const styles = workingDir.styles || 'styles/styles.scss';
  const stylesOutFolder = workingDir.stylesOutFolder || 'assets/css';

  WORKING_DIR.base = base;
  WORKING_DIR.src = resolve(WORKING_DIR.base, src);
  WORKING_DIR.assets = resolve(WORKING_DIR.src, assets);
  WORKING_DIR.i18n = resolve(WORKING_DIR.src, i18n);
  WORKING_DIR.app = resolve(WORKING_DIR.src, app);
  WORKING_DIR.pages = resolve(WORKING_DIR.app, pages);
  WORKING_DIR.components = resolve(WORKING_DIR.app, components);
  WORKING_DIR.dataSources = resolve(WORKING_DIR.app, dataSources);
  WORKING_DIR.pagesToGenerate = resolve(WORKING_DIR.app, pagesToGenerate);
  WORKING_DIR.posts = resolve(WORKING_DIR.app, posts);
  WORKING_DIR.scripts = resolve(WORKING_DIR.app, scripts);
  WORKING_DIR.styles = resolve(WORKING_DIR.app, styles);
  WORKING_DIR.out = resolve(WORKING_DIR.base, out);
  WORKING_DIR.scriptsOutFolder = resolve(WORKING_DIR.out, scriptsOutFolder);
  WORKING_DIR.stylesOutFolder = resolve(WORKING_DIR.out, stylesOutFolder);

  if (createDirs)
    setDirs(skipOut);
}

const OUT_KEYS: Array<keyof WorkingDirConfig> = ['out', 'scriptsOutFolder', 'stylesOutFolder'];

function setDirs(skipOut: boolean): void {
  for (const key of Object.keys(WORKING_DIR) as Array<keyof WorkingDirConfig>) {
    if (skipOut && OUT_KEYS.includes(key))
      continue;
    if (key === 'styles' || key === 'scripts')
      ensureFile(WORKING_DIR[key]);
    else
      mkdirSync(WORKING_DIR[key], { recursive: true });
  }
}

function ensureFile(path: string): void {
  if (existsSync(path))
    return;
  mkdirSync(dirname(path), { recursive: true });
  closeSync(openSync(path, 'a'));
}
