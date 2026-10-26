import { performance } from 'perf_hooks';
import { cleanOut, copyAssets, copyPages } from '../assets/copy-assets.function';
import { bundleScripts, ScriptsBundle } from '../assets/scripts/bundle-scripts.function';
import { compileStyles } from '../assets/styles/compile-styles.function';
import { ConfigLoadError, loadedSiteModules, setupYassb } from '../config/setup.function';
import { WORKING_DIR } from '../config/working-dir.constant';
import { DIAGNOSTICS, describeError, report } from '../diagnostics/diagnostics';
import { FilesContentInjector } from '../directives/files-content-injector.class';
import { GeneratePagesFromMd } from '../directives/pages-generator/generate-pages-from-md.class';
import { LANGS } from '../i18n/langs.constant';
import type { Translator } from '../i18n/translator.class';
import { PostProcessFiles } from '../post-processing/post-process-files.class';
import { SitemapGenerator } from '../sitemap/sitemap-generator.class';
import { logDone, logInfo, logStep } from '../tools/loggers.function';
import type { BuildResult, YassbConfig } from '../yassb';

/**
 * The build pipeline. The order of the steps is part of the contract with sites (see AGENTS.md):
 *
 * 1. load the configuration, set folders and languages;
 * 2. copy `src/assets` to `out`; start bundling the scripts (in memory, in parallel);
 * 3. generate pages from Markdown (`generate-from-files`);
 * 4. for each language: copy the pages to `out/<lang>`, list the files of `out` (sitemap, for `url-to`),
 *    then for each page: `component` (recursive) → built-in directives → custom directives → translation;
 * 5. post-process every page: front matter placeholders → `postProcessors` → minify (or live reload in watch);
 *    delete `sitemap.xml` unless `siteHost` is set;
 * 6. compile the stylesheet; write the scripts bundle;
 * 7. `afterBuild` hook.
 *
 * @featurePart behaviour.pipeline
 */

export interface BuildSteps {
  /** Copy pages, generate pages, process directives, translate, post-process. Default: true. */
  html?: boolean;
  /** Compile the stylesheet. Default: true. */
  styles?: boolean;
  /** Bundle the scripts. Default: true. */
  scripts?: boolean;
}

/**
 * @featurePart behaviour.pipeline
 */
export interface BuildOptions {
  /** `yassb watch` mode: no minification, live-reload script injected. */
  watchMode?: boolean;
  steps?: BuildSteps;
  /** Fail on any error (also enabled by `strict: true` in the configuration). */
  strict?: boolean;
  /** Empty the output folder first (also enabled by `cleanOut: true`). */
  clean?: boolean;
  /** Replaces `workingDir.out`. */
  outDir?: string;
  /** HTML injected before `</body>` in watch mode. */
  liveReloadSnippet?: string;
  /** Called as soon as the configuration is loaded. */
  onSetup?: (info: SetupInfo) => void;
}

/**
 * What the watcher needs to know about a project.
 *
 * @featurePart behaviour.pipeline
 */
export interface SetupInfo {
  out: string;
  src: string;
  base: string;
  langs: Array<string>;
  devServerPort?: number;
  hasCustomStylesParser: boolean;
  stylesEntry: string;
  configFiles: Array<string>;
}

/**
 * Build result with the details used by `watch`, `check` and `inspect`.
 *
 * @featurePart behaviour.pipeline
 */
export interface DetailedBuildResult extends BuildResult {
  /** Files read by each step, to rebuild only what a change affects. */
  inputs: {
    scripts: Array<string>;
    styles: Array<string>;
    /** Site modules loaded by the configuration (renderers, directives…). */
    code: Array<string>;
  };
  /** Translators used, one per language (for i18n checks). */
  translators: Array<Translator>;
  config?: YassbConfig;
  configFiles: Array<string>;
}

/**
 * Runs a build in the current folder (`process.cwd()` is the project root, as in 1.x).
 *
 * @feature behaviour.pipeline
 * @summary The fixed order in which a build processes a site.
 * @usage yassb build, yassb watch, or programmatically: await runBuild({ strict: true }) in the project folder.
 * @options BuildOptions: watchMode, steps { html, styles, scripts }, strict, clean, outDir.
 * @rules config → beforeBuild → assets copy → scripts bundling starts → generate-from-files → for each language: copy pages (all files of pages/), list output files (url-to, sitemap), then per HTML page: components → front matter → built-in directives → custom directives → translation → post-processing of every HTML file of the output → styles → scripts written → afterBuild; directives left in a page after processing are reported.
 * @errors DIRECTIVE_UNPROCESSED
 * @status stable
 * @since 1.0.0
 * @related behaviour.post-processing, api.custom-directives, i18n.translation
 */
export async function runBuild(options: BuildOptions = {}): Promise<DetailedBuildResult> {
  const startedAt = performance.now();
  const watchMode = !!options.watchMode;
  const steps = { html: true, styles: true, scripts: true, ...(options.steps || {}) };
  DIAGNOSTICS.reset();

  const result: DetailedBuildResult = {
    ok: false,
    durationMs: 0,
    diagnostics: [],
    out: '',
    watchMode,
    inputs: { scripts: [], styles: [], code: [] },
    translators: [],
    configFiles: []
  };

  let config: YassbConfig;
  try {
    const setup = setupYassb({ outDir: options.outDir });
    config = setup.config;
    result.config = config;
    result.configFiles = setup.configFiles;
  } catch (error) {
    if (!(error instanceof ConfigLoadError))
      report({ level: 'error', code: 'CONFIG_LOAD_FAILED', fatal: true, message: describeError(error).message, detail: describeError(error).detail });
    return finish(result, startedAt, !!options.strict);
  }

  result.out = WORKING_DIR.out;
  result.inputs.code = loadedSiteModules();
  const strict = !!(options.strict || config.strict);

  options.onSetup?.({
    out: WORKING_DIR.out,
    src: WORKING_DIR.src,
    base: WORKING_DIR.base,
    langs: [...LANGS],
    devServerPort: config.devServerPort,
    hasCustomStylesParser: typeof config.stylesParser === 'function',
    stylesEntry: WORKING_DIR.styles,
    configFiles: result.configFiles
  });

  logInfo(watchMode ? 'Rebuilding...' : 'Building...');

  if (options.clean || config.cleanOut)
    cleanOut();

  if (!(await runHook(config, 'beforeBuild', { watchMode, out: WORKING_DIR.out, langs: [...LANGS] })))
    return finish(result, startedAt, strict);

  timed('assets', () => copyAssets());

  let scriptsTask: Promise<ScriptsBundle | undefined> | undefined;
  if (steps.scripts) {
    logStep('scripts');
    scriptsTask = bundleScripts(config, watchMode);
  }

  if (steps.html) {
    timed('texts', () => new GeneratePagesFromMd(config).make());

    const langs = LANGS.length ? [...LANGS] : [undefined];
    for (const lang of langs) {
      const label = lang ? `.html for lang ${lang}` : '.html';
      timed(label, () => {
        copyPages(lang);
        new SitemapGenerator(config).make();
        const injector = new FilesContentInjector(config);
        injector.make(lang);
        if (injector.translator)
          result.translators.push(injector.translator);
      });
    }

    logStep('Post processing');
    const postStarted = performance.now();
    await new PostProcessFiles(config, watchMode, options.liveReloadSnippet).do();
    logDone('Post processing', performance.now() - postStarted);
  }

  if (steps.styles && !config.skipsStyles) {
    logStep('styles');
    const stylesStarted = performance.now();
    const styles = await compileStyles(config);
    result.inputs.styles = styles.inputs;
    logDone('styles', performance.now() - stylesStarted);
  }

  if (scriptsTask) {
    const scriptsStarted = performance.now();
    const bundle = await scriptsTask;
    if (bundle) {
      bundle.write();
      result.inputs.scripts = bundle.inputs;
    }
    logDone('scripts', performance.now() - scriptsStarted);
  }

  reportMissingTranslations(result.translators);

  finish(result, startedAt, strict);
  await runHook(config, 'afterBuild', result);
  result.diagnostics = DIAGNOSTICS.all();
  result.ok = computeOk(strict);
  return result;
}

function timed(label: string, task: () => unknown): void {
  logStep(label);
  const started = performance.now();
  task();
  logDone(label, performance.now() - started);
}

async function runHook<K extends 'beforeBuild' | 'afterBuild'>(config: YassbConfig, name: K, argument: Parameters<NonNullable<YassbConfig[K]>>[0]): Promise<boolean> {
  const hook = config[name] as ((arg: unknown) => void | Promise<void>) | undefined;
  if (typeof hook !== 'function')
    return true;
  try {
    await hook(argument);
    return true;
  } catch (error) {
    const { message, detail } = describeError(error);
    report({ level: 'error', code: 'HOOK_FAILED', fatal: true, message: `${name} failed: ${message}`, detail });
    return false;
  }
}

/** One warning per missing key and language, listing where the key is used. */
function reportMissingTranslations(translators: Array<Translator>): void {
  const counts: Array<string> = [];
  for (const translator of translators) {
    if (translator.missingKeys.size)
      counts.push(`${translator.lang}: ${translator.missingKeys.size}`);
    for (const [key, files] of translator.missingKeys)
      report({
        level: 'warning',
        code: 'I18N_MISSING_KEY',
        quiet: true,
        file: files.size ? [...files][0] : undefined,
        message: `Missing translation "${key}" in ${translator.lang}.json${files.size > 1 ? ` (used in ${files.size} files)` : ''}; the original text was kept.`
      });
  }
  if (counts.length)
    logInfo(`  i18n: missing translations (${counts.join(', ')}); run \`yassb check\` for the list.`);
}

function computeOk(strict: boolean): boolean {
  return !DIAGNOSTICS.hasFatal() && !(strict && DIAGNOSTICS.errors().length > 0);
}

function finish(result: DetailedBuildResult, startedAt: number, strict: boolean): DetailedBuildResult {
  result.durationMs = Math.round(performance.now() - startedAt);
  result.diagnostics = DIAGNOSTICS.all();
  result.ok = computeOk(strict);
  return result;
}
