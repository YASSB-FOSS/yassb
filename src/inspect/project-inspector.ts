import matter from 'gray-matter';
import { existsSync, readFileSync } from 'fs';
import { basename, extname, isAbsolute, parse, relative, resolve, sep } from 'path';
import { ConfigLoadError, setupYassb } from '../config/setup.function';
import { workingDirSetter } from '../config/working-dir-setter.function';
import { WORKING_DIR } from '../config/working-dir.constant';
import { DIAGNOSTICS, Diagnostic } from '../diagnostics/diagnostics';
import { DirectivesParser } from '../directives/directives-parser.class';
import { HtmlFromDataSource } from '../directives/data-from-source/html-from-data-source.class';
import { InsertScriptSrc } from '../directives/insert-script-src/insert-script-src.class';
import { InsertStylesSrc } from '../directives/insert-styles-src/insert-styles-src.class';
import { TemplateToHtmlFiles } from '../directives/pages-generator/template-to-html-files.class';
import { PublicFileList } from '../directives/public-file-list/public-file-list.class';
import { DirectivePropsGetter } from '../directives/tools/directive-props-getter.class';
import { UrlTo } from '../directives/url-to/url-to.class';
import { parseElements, textContent } from '../html/html-scanner';
import { langsSetter } from '../i18n/langs-setter.function';
import { LANGS } from '../i18n/langs.constant';
import { Translator } from '../i18n/translator.class';
import { BUILT_IN_RENDERERS } from '../renderers/renderers-store.constant';
import { ListFiles } from '../tools/file-system-helpers/list-files.class';
import { SupportedFormats } from '../tools/files-content-helpers/supported-formats.enum';
import { camelToKebabCase } from '../tools/strings-formatters/camel-to-kebab-case.function';
import type { YassbConfig } from '../yassb';

/**
 * Static description of a YASSB project, built without running a build or any renderer.
 * Paths are relative to the project root, except component and data source names, which are relative to their
 * folders (as written in directives).
 *
 * @featurePart cli.inspect
 */
export interface ProjectManifest {
  yassb: { version: string };
  project: {
    root: string;
    name?: string;
    version?: string;
    configFiles: Array<string>;
    /** npm scripts of the site. */
    scripts: { [name: string]: string };
  };
  folders: { [name: string]: string };
  languages: Array<string>;
  options: { [name: string]: unknown };
  pages: Array<PageInfo>;
  templates: Array<TemplateInfo>;
  components: Array<ComponentInfo>;
  dataSources: Array<DataSourceInfo>;
  renderers: Array<RendererInfo>;
  customDirectives: Array<{ name: string; regex: string; uses: Array<DirectiveUse> }>;
  postProcessors: Array<string>;
  hooks: Array<string>;
  assets: {
    styles: { entry: string; output: string; compiler: string };
    scripts: { entry: string; output: string; bundler: string };
    assetsFolder: string;
    assetFiles: number;
  };
  i18n: {
    languages: Array<string>;
    keys: { [lang: string]: number };
    /** Keys written in HTML sources (renderers can add more at build time). */
    usedInSources: Array<string>;
    missing: { [lang: string]: Array<string> };
    inconsistent: Array<string>;
    notReferencedInSources: Array<string>;
  };
  /** Problems visible without building (missing files, unknown renderers, invalid options…). */
  diagnostics: Array<Diagnostic>;
}

/**
 * @featurePart cli.inspect
 */
export interface DirectiveUse {
  /** `component`, `create-from-data-source`, `public-file-list`, `url-to`, `include-script-src`, `include-styles-src`, `generate-from-files`, or the class name of a custom directive. */
  type: string;
  file: string;
  line: number;
  text: string;
  target?: string;
  renderer?: string;
  options?: unknown;
  /** For directives pointing to a file: whether it exists. */
  exists?: boolean;
}

/**
 * @featurePart cli.inspect
 */
export interface PageInfo {
  source: string;
  outputs: Array<string>;
  title?: string;
  /** Components included, directly or not. */
  components: Array<string>;
  /** Directives of the page and of its components. */
  directives: Array<DirectiveUse>;
  i18nKeys: Array<string>;
}

/**
 * @featurePart cli.inspect
 */
export interface TemplateInfo {
  source: string;
  from?: string;
  pages: Array<{ source: string; output: string; title?: string; date?: string }>;
  components: Array<string>;
  directives: Array<DirectiveUse>;
}

/**
 * @featurePart cli.inspect
 */
export interface ComponentInfo {
  name: string;
  file: string;
  usedBy: Array<string>;
}

/**
 * @featurePart cli.inspect
 */
export interface DataSourceInfo {
  name: string;
  file: string;
  shape: string;
  usedBy: Array<{ file: string; line: number; renderer?: string }>;
}

/**
 * @featurePart cli.inspect
 */
export interface RendererInfo {
  name: string;
  builtIn: boolean;
  usedBy: Array<{ file: string; line: number; target?: string }>;
}

interface ScanResult {
  directives: Array<DirectiveUse>;
  components: Set<string>;
  keys: Set<string>;
}

/**
 * Builds the manifest of the project in the current folder. Loads the configuration (to know folders, renderers
 * and custom directives) but runs nothing else and writes nothing.
 *
 * @featurePart cli.inspect
 */
export function inspectProject(): ProjectManifest {
  DIAGNOSTICS.reset();
  const wasSilent = DIAGNOSTICS.silent;
  DIAGNOSTICS.silent = true;

  let config: YassbConfig = {};
  let configFiles: Array<string> = [];
  try {
    const setup = setupYassb({ createDirs: false });
    config = setup.config;
    configFiles = setup.configFiles;
  } catch (error) {
    if (!(error instanceof ConfigLoadError))
      throw error;
    workingDirSetter({}, false, false);
    langsSetter();
  }

  const inspector = new Inspector(config, configFiles);
  const manifest = inspector.run();
  DIAGNOSTICS.silent = wasSilent;
  return manifest;
}

class Inspector {

  private root = process.cwd();
  private componentUsers = new Map<string, Set<string>>();
  private dataSourceUsers = new Map<string, Array<{ file: string; line: number; renderer?: string }>>();
  private rendererUsers = new Map<string, Array<{ file: string; line: number; target?: string }>>();
  private customUses = new Map<string, Array<DirectiveUse>>();
  private diagnostics: Array<Diagnostic> = [];
  private fileCache = new Map<string, ScanResult>();

  constructor(private config: YassbConfig, private configFiles: Array<string>) { }

  public run(): ProjectManifest {
    const langs = [...LANGS];
    const pages = this.inspectPages(langs);
    const templates = this.inspectTemplates(langs);
    const usedKeys = new Set<string>();
    for (const scan of this.fileCache.values())
      scan.keys.forEach(key => usedKeys.add(key));

    const pkg = this.readPackageJson();
    return {
      yassb: { version: yassbVersion() },
      project: {
        root: this.root,
        name: pkg.name,
        version: pkg.version,
        configFiles: this.configFiles.map(file => this.rel(file)),
        scripts: pkg.scripts || {}
      },
      folders: Object.fromEntries(Object.entries(WORKING_DIR).map(([key, value]) => [key, this.rel(value)])),
      languages: langs,
      options: {
        siteHost: this.config.siteHost,
        devServerPort: this.config.devServerPort ?? 3000,
        strict: !!this.config.strict,
        cleanOut: !!this.config.cleanOut,
        sitemap: this.config.sitemap !== false,
        skipsStyles: !!this.config.skipsStyles,
        i18nAllowHtml: !!this.config.i18n?.allowHtml,
        htmlMinificationOptions: this.config.htmlMinificationOptions || {}
      },
      pages,
      templates,
      components: this.listComponents(),
      dataSources: this.listDataSources(),
      renderers: this.listRenderers(),
      customDirectives: (this.config.customDirectives || []).map(directive => ({
        name: directive.name,
        regex: directive.regex ? String(directive.regex) : '(missing static regex)',
        uses: this.customUses.get(directive.name) || []
      })),
      postProcessors: (this.config.postProcessors || []).map(fn => fn.name || '(anonymous)'),
      hooks: (['beforeBuild', 'afterBuild'] as const).filter(name => typeof this.config[name] === 'function'),
      assets: this.assets(),
      i18n: this.i18n(langs, usedKeys),
      diagnostics: [...DIAGNOSTICS.all(), ...this.diagnostics]
    };
  }

  private inspectPages(langs: Array<string>): Array<PageInfo> {
    const files = new ListFiles(WORKING_DIR.pages, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    return files.map(file => {
      const scan = this.scanForLanguages(file, langs);
      const rel = relative(WORKING_DIR.pages, file);
      const outputs = (langs.length ? langs.map(lang => resolve(WORKING_DIR.out, lang, rel)) : [resolve(WORKING_DIR.out, rel)]).map(path => this.rel(path));
      return {
        source: this.rel(file),
        outputs,
        title: titleOf(readFileSync(file, 'utf8')),
        components: [...scan.components].sort(),
        directives: scan.directives,
        i18nKeys: [...scan.keys].sort()
      };
    });
  }

  private inspectTemplates(langs: Array<string>): Array<TemplateInfo> {
    const files = new ListFiles(WORKING_DIR.pagesToGenerate, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    return files.map(file => {
      const scan = this.scanForLanguages(file, langs);
      const text = readFileSync(file, 'utf8');
      const directive = (text.match(TemplateToHtmlFiles.regex) || [])[0];
      const info: TemplateInfo = { source: this.rel(file), pages: [], components: [...scan.components].sort(), directives: scan.directives };
      if (!directive)
        return info;
      const folder = new DirectivePropsGetter(directive, this.config).parse()['generate-from-files'] as string;
      const from = isAbsolute(folder) ? folder : resolve(WORKING_DIR.posts, folder);
      info.from = this.rel(from);
      const templateDir = parse(relative(WORKING_DIR.pagesToGenerate, file)).dir;
      for (const source of new ListFiles(from, name => name.endsWith('.md') || name.endsWith('.txt')).init()) {
        let data: { [key: string]: any } = {};
        try {
          data = matter(readFileSync(source, 'utf8'), (this.config.grayMatterOption || {}) as never).data;
        } catch {
          // invalid front matter: reported by the build
        }
        const name = data.slug ? `${data.slug}.html` : `${camelToKebabCase(String(data.title || basename(source, extname(source))))}.html`;
        const output = resolve(WORKING_DIR.out, templateDir, parse(relative(from, source)).dir, name);
        info.pages.push({
          source: this.rel(source),
          output: this.rel(output),
          title: data.title,
          date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date
        });
      }
      return info;
    });
  }

  /** Scans a page once per language (component paths may contain `LANG`) and merges the results. */
  private scanForLanguages(file: string, langs: Array<string>): ScanResult {
    const merged: ScanResult = { directives: [], components: new Set(), keys: new Set() };
    const seen = new Set<string>();
    for (const lang of langs.length ? langs : [undefined]) {
      const scan = this.scanFile(file, lang, new Set());
      for (const use of scan.directives) {
        const key = `${use.file}:${use.line}:${use.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.directives.push(use);
        }
      }
      scan.components.forEach(component => merged.components.add(component));
      scan.keys.forEach(key => merged.keys.add(key));
    }
    return merged;
  }

  private scanFile(file: string, lang: string | undefined, visiting: Set<string>): ScanResult {
    const cacheKey = `${lang}|${file}`;
    const cached = this.fileCache.get(cacheKey);
    if (cached)
      return cached;

    const result: ScanResult = { directives: [], components: new Set(), keys: new Set() };
    if (!existsSync(file) || visiting.has(file))
      return result;
    visiting.add(file);
    const text = readFileSync(file, 'utf8');
    const relFile = this.rel(file);
    const lineAt = (index: number) => text.slice(0, index).split('\n').length;

    for (const match of text.matchAll(withGlobal(DirectivesParser.regex))) {
      const props = new DirectivePropsGetter(match[0], this.config, lang).parse();
      const target = props.component as string;
      if (!target)
        continue;
      const fullPath = isAbsolute(target) ? target : resolve(WORKING_DIR.components, target);
      const name = this.componentName(fullPath);
      const exists = existsSync(fullPath);
      result.directives.push({ type: 'component', file: relFile, line: lineAt(match.index!), text: match[0], target: name, exists });
      result.components.add(name);
      const users = this.componentUsers.get(name) || new Set<string>();
      users.add(relFile);
      this.componentUsers.set(name, users);
      if (!exists)
        this.problem('COMPONENT_NOT_FOUND', relFile, lineAt(match.index!), `Component "${target}" not found (${this.rel(fullPath)}).`, match[0]);
      else if (Object.values(SupportedFormats).includes(extname(fullPath) as SupportedFormats) && extname(fullPath) !== '.md' && extname(fullPath) !== '.txt') {
        const nested = this.scanFile(fullPath, lang, new Set(visiting));
        result.directives.push(...nested.directives);
        nested.components.forEach(component => result.components.add(component));
        nested.keys.forEach(key => result.keys.add(key));
      }
    }

    for (const match of text.matchAll(withGlobal(HtmlFromDataSource.regex))) {
      const getter = new DirectivePropsGetter(match[0], this.config, lang);
      const props = getter.parse();
      const target = props['create-from-data-source'] as string;
      const renderer = props.renderer as string | undefined;
      const line = lineAt(match.index!);
      const fullPath = resolve(WORKING_DIR.dataSources, target || '');
      const exists = !!target && existsSync(fullPath);
      result.directives.push({ type: 'create-from-data-source', file: relFile, line, text: match[0], target, renderer, options: props.options, exists });
      if (target) {
        const users = this.dataSourceUsers.get(target) || [];
        if (!users.some(user => user.file === relFile && user.line === line))
          users.push({ file: relFile, line, renderer });
        this.dataSourceUsers.set(target, users);
      }
      this.useRenderer(renderer, relFile, line, target);
      if (!exists)
        this.problem('DATA_SOURCE_NOT_FOUND', relFile, line, `Data source "${target}" not found (${this.rel(fullPath)}).`, match[0]);
      for (const error of getter.errors)
        this.problem(error.code, relFile, line, error.message, match[0]);
    }

    for (const match of text.matchAll(withGlobal(PublicFileList.regex))) {
      const props = new DirectivePropsGetter(match[0], this.config, lang).parse();
      const line = lineAt(match.index!);
      result.directives.push({ type: 'public-file-list', file: relFile, line, text: match[0], target: props['public-file-list'] as string, renderer: props.renderer as string });
      this.useRenderer(props.renderer as string, relFile, line, props['public-file-list'] as string);
    }

    for (const match of text.matchAll(withGlobal(UrlTo.regex))) {
      const props = new DirectivePropsGetter(match[0], this.config, lang).parse();
      result.directives.push({ type: 'url-to', file: relFile, line: lineAt(match.index!), text: match[0], target: props['url-to'] as string });
    }

    for (const [regex, type] of [[InsertScriptSrc.regex, 'include-script-src'], [InsertStylesSrc.regex, 'include-styles-src'], [TemplateToHtmlFiles.regex, 'generate-from-files']] as Array<[RegExp, string]>)
      for (const match of text.matchAll(withGlobal(regex)))
        result.directives.push({ type, file: relFile, line: lineAt(match.index!), text: match[0] });

    for (const directive of this.config.customDirectives || []) {
      if (!directive || !(directive.regex instanceof RegExp))
        continue;
      for (const match of text.matchAll(withGlobal(directive.regex))) {
        const use: DirectiveUse = { type: directive.name, file: relFile, line: lineAt(match.index!), text: match[0] };
        result.directives.push(use);
        const uses = this.customUses.get(directive.name) || [];
        if (!uses.some(other => other.file === use.file && other.line === use.line && other.text === use.text))
          uses.push(use);
        this.customUses.set(directive.name, uses);
      }
    }

    i18nKeysOf(text).forEach(key => result.keys.add(key));
    this.fileCache.set(cacheKey, result);
    return result;
  }

  private useRenderer(name: string | undefined, file: string, line: number, target?: string): void {
    const key = name || '(none: basicElement)';
    const users = this.rendererUsers.get(key) || [];
    if (users.some(user => user.file === file && user.line === line && user.target === target))
      return;
    users.push({ file, line, target });
    this.rendererUsers.set(key, users);
    if (name && !BUILT_IN_RENDERERS[name] && !(this.config.customRenderers || {})[name])
      this.problem('RENDERER_NOT_FOUND', file, line, `Renderer "${name}" is not registered in customRenderers.`);
  }

  private listComponents(): Array<ComponentInfo> {
    const files = new ListFiles(WORKING_DIR.components).init();
    const names = new Set<string>([...files.map(file => this.componentName(file)), ...this.componentUsers.keys()]);
    return [...names].sort().map(name => ({
      name,
      file: this.rel(resolve(WORKING_DIR.components, name)),
      usedBy: [...(this.componentUsers.get(name) || [])].sort()
    }));
  }

  private listDataSources(): Array<DataSourceInfo> {
    const files = new ListFiles(WORKING_DIR.dataSources, name => name.endsWith('.json')).init();
    return files.map(file => {
      const name = relative(WORKING_DIR.dataSources, file).split(sep).join('/');
      return { name, file: this.rel(file), shape: shapeOf(file), usedBy: this.dataSourceUsers.get(name) || [] };
    });
  }

  private listRenderers(): Array<RendererInfo> {
    const names = new Set<string>([...Object.keys(BUILT_IN_RENDERERS), ...Object.keys(this.config.customRenderers || {}), ...this.rendererUsers.keys()]);
    return [...names].sort().map(name => ({
      name,
      builtIn: !!BUILT_IN_RENDERERS[name] && !(this.config.customRenderers || {})[name],
      usedBy: this.rendererUsers.get(name) || []
    }));
  }

  private assets(): ProjectManifest['assets'] {
    let version = '0.0.0';
    try {
      version = String(this.readPackageJson().version || version);
    } catch {
      // no package.json
    }
    const name = (entry: string, extension: string) => `${basename(entry, extname(entry))}-${version.replace(/\./g, '-')}.min.${extension}`;
    return {
      styles: {
        entry: this.rel(WORKING_DIR.styles),
        output: this.rel(resolve(WORKING_DIR.stylesOutFolder, name(WORKING_DIR.styles, 'css'))),
        compiler: this.config.skipsStyles ? 'skipped' : this.config.stylesParser ? `custom (${this.config.stylesParser.name || 'stylesParser'})` : 'sass'
      },
      scripts: {
        entry: this.rel(WORKING_DIR.scripts),
        output: this.rel(resolve(WORKING_DIR.scriptsOutFolder, name(WORKING_DIR.scripts, 'js'))),
        bundler: this.config.webpackConfig ? 'webpack (legacy webpackConfig)' : 'esbuild'
      },
      assetsFolder: this.rel(WORKING_DIR.assets),
      assetFiles: new ListFiles(WORKING_DIR.assets).init().length
    };
  }

  private i18n(langs: Array<string>, usedKeys: Set<string>): ProjectManifest['i18n'] {
    const keysByLang = new Map<string, Set<string>>();
    for (const lang of langs)
      keysByLang.set(lang, new Set(flattenKeys(Translator.readTranslations(resolve(WORKING_DIR.i18n, `${lang}.json`)))));
    const all = new Set<string>();
    keysByLang.forEach(keys => keys.forEach(key => all.add(key)));
    const missing: { [lang: string]: Array<string> } = {};
    for (const [lang, keys] of keysByLang)
      missing[lang] = [...usedKeys].filter(key => !keys.has(key)).sort();
    return {
      languages: langs,
      keys: Object.fromEntries([...keysByLang].map(([lang, keys]) => [lang, keys.size])),
      usedInSources: [...usedKeys].sort(),
      missing,
      inconsistent: [...all].filter(key => [...keysByLang.values()].some(keys => !keys.has(key))).sort(),
      notReferencedInSources: [...all].filter(key => !usedKeys.has(key)).sort()
    };
  }

  private componentName(fullPath: string): string {
    return relative(WORKING_DIR.components, fullPath).split(sep).join('/');
  }

  private problem(code: string, file: string, line: number, message: string, directive?: string): void {
    if (!this.diagnostics.some(item => item.code === code && item.file === file && item.line === line && item.message === message))
      this.diagnostics.push({ level: 'error', code, file, line, message, directive });
  }

  private rel(path: string): string {
    const rel = relative(this.root, path).split(sep).join('/');
    return rel.startsWith('..') ? path : rel || '.';
  }

  private readPackageJson(): { name?: string; version?: string; scripts?: { [name: string]: string } } {
    const file = resolve(this.root, 'package.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }

}

function withGlobal(regex: RegExp): RegExp {
  return new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
}

/**
 * Translation keys written in HTML: `data-t="KEY"`, text of `data-t` elements, `<attr>-t="KEY"` with `data-attr-t`.
 *
 * @internal
 */
export function i18nKeysOf(html: string): Set<string> {
  const keys = new Set<string>();
  if (!html.includes('data-t') && !html.includes('data-attr-t'))
    return keys;
  for (const element of parseElements(html)) {
    const attrs = element.tag.attrs;
    const dataT = attrs.find(attr => attr.name === 'data-t');
    if (dataT) {
      const key = dataT.value || textContent(html.slice(element.contentStart, element.contentEnd));
      if (key && !key.includes('{ '))
        keys.add(key);
    }
    if (attrs.some(attr => attr.name === 'data-attr-t'))
      for (const attr of attrs)
        if (attr.name.endsWith('-t') && attr.name !== 'data-t' && attr.name !== 'data-attr-t' && attr.value && !attr.value.includes('{{'))
          keys.add(attr.value);
  }
  return keys;
}

/**
 * Flat keys of a translation file (nested objects become dotted keys).
 *
 * @internal
 */
export function flattenKeys(translations: { [key: string]: unknown }, prefix: string = ''): Array<string> {
  const keys: Array<string> = [];
  for (const [key, value] of Object.entries(translations)) {
    if (value && typeof value === 'object' && !Array.isArray(value))
      keys.push(...flattenKeys(value as { [key: string]: unknown }, `${prefix}${key}.`));
    else
      keys.push(`${prefix}${key}`);
  }
  return keys;
}

/** Short description of a JSON file: `array(12) of {date, title, …}` or `object {a, b}`. */
function shapeOf(file: string): string {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return 'invalid JSON';
  }
  const keysOf = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value as object) : [];
  if (Array.isArray(data)) {
    const keys = new Set<string>();
    data.slice(0, 50).forEach(item => keysOf(item).forEach(key => keys.add(key)));
    const list = [...keys];
    const itemType = list.length ? `{${list.slice(0, 8).join(', ')}${list.length > 8 ? ', …' : ''}}` : (data.length ? typeof data[0] : 'empty');
    return `array(${data.length}) of ${itemType}`;
  }
  if (data && typeof data === 'object') {
    const list = keysOf(data);
    return `object {${list.slice(0, 8).join(', ')}${list.length > 8 ? ', …' : ''}}`;
  }
  return typeof data;
}

function titleOf(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? textContent(match[1]).trim() || undefined : undefined;
}

function yassbVersion(): string {
  try {
    return JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}
