import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { YassbConfig } from '@yassb/yassb';
import { ensureDirSync, ensureFileSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Set the working dir based on the default values or the values passed in the configuration.
 *
 * @param workingDir the values for the workingDir option passed in the ocnfiguration.
 * @param skipOut whether to skip the creation of `out` folders and assets. Used to create a new project.
 */
export function workingDirSetter(workingDir: YassbConfig['workingDir'], skipOut: boolean = false): void {
  const base = workingDir.base ? resolve(process.cwd(), workingDir.base) : process.cwd();
  const src = workingDir.src ? workingDir.src : 'src';
  const assets = workingDir.assets ? workingDir.assets : 'assets';
  const i18n = workingDir.i18n ? workingDir.i18n : 'i18n';
  const app = workingDir.app ? workingDir.app : 'app';
  const pages = workingDir.pages ? workingDir.pages : 'pages';
  const posts = workingDir.posts ? workingDir.posts : '';
  const components = workingDir.components ? workingDir.components : 'components';
  const dataSources = workingDir.dataSources ? workingDir.dataSources : 'data-sources';
  const pagesToGenerate = workingDir.pagesToGenerate ? workingDir.pagesToGenerate : 'pages-to-generate';
  const out = workingDir.out ? workingDir.out : 'dist/public';

  const scripts = workingDir.scripts ? workingDir.scripts : 'scripts/main.ts';
  const scriptsOutFolder = workingDir.scriptsOutFolder ? workingDir.scriptsOutFolder : 'assets/js';

  const styles = workingDir.styles ? workingDir.styles : 'styles/styles.scss';
  const stylesOutFolder = workingDir.stylesOutFolder ? workingDir.stylesOutFolder : 'assets/css';

  WORKING_DIR.base = base;
  /**/ WORKING_DIR.src = resolve(WORKING_DIR.base, src);
  /** **/ WORKING_DIR.assets = resolve(WORKING_DIR.src, assets);
  /** **/ WORKING_DIR.i18n = resolve(WORKING_DIR.src, i18n);
  /** **/ WORKING_DIR.app = resolve(WORKING_DIR.src, app);
  /** ** **/ WORKING_DIR.pages = resolve(WORKING_DIR.app, pages);
  /** ** **/ WORKING_DIR.components = resolve(WORKING_DIR.app, components);
  /** ** **/ WORKING_DIR.dataSources = resolve(WORKING_DIR.app, dataSources);
  /** ** **/ WORKING_DIR.pagesToGenerate = resolve(WORKING_DIR.app, pagesToGenerate);
  /** ** **/ WORKING_DIR.posts = resolve(WORKING_DIR.app, posts);
  /** ** **/ WORKING_DIR.scripts = resolve(WORKING_DIR.app, scripts);
  /** ** **/ WORKING_DIR.styles = resolve(WORKING_DIR.app, styles);
  /**/ WORKING_DIR.out = resolve(WORKING_DIR.base, out);
  /** **/ WORKING_DIR.scriptsOutFolder = resolve(WORKING_DIR.out, scriptsOutFolder);
  /** **/ WORKING_DIR.stylesOutFolder = resolve(WORKING_DIR.out, stylesOutFolder);

  setDirs(skipOut);

}

function setDirs(skipOut: boolean): void {
  for (const key in WORKING_DIR)
    if (key !== 'styles' && key !== 'scripts' && skipOutCondition(key as keyof typeof WORKING_DIR, skipOut))
      ensureDirSync(WORKING_DIR[key]);
    else if (skipOutCondition(key as keyof typeof WORKING_DIR, skipOut))
      ensureFileSync(WORKING_DIR[key]);
}

function skipOutCondition(key: keyof typeof WORKING_DIR, skipOut: boolean): boolean {
  if (skipOut === false)
    return true;

  if (key === 'out' || key === 'scriptsOutFolder' || key === 'stylesOutFolder')
    return false;

  return true;
}
