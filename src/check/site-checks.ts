import { existsSync, readFileSync } from 'fs';
import { dirname, relative, resolve, sep } from 'path';
import { undeclaredImports, FORMER_DEPENDENCIES } from '../config/setup.function';
import { WORKING_DIR } from '../config/working-dir.constant';
import type { Diagnostic } from '../diagnostics/diagnostics';
import { parseElements } from '../html/html-scanner';
import { flattenKeys, inspectProject } from '../inspect/project-inspector';
import { LANGS } from '../i18n/langs.constant';
import { Translator } from '../i18n/translator.class';
import { runBuild } from '../pipeline/build';
import { ListFiles } from '../tools/file-system-helpers/list-files.class';

/** Result of `yassb check`. */
export interface CheckReport {
  /** False if any error was found. */
  ok: boolean;
  durationMs: number;
  out: string;
  counts: { error: number; warning: number; info: number };
  diagnostics: Array<Diagnostic>;
}

export interface CheckOptions {
  outDir?: string;
  /** Check local links in the output (default: true). */
  links?: boolean;
}

/**
 * Builds the site (production mode) and validates the result:
 * every problem reported by the build, plus translation attributes left in pages, missing/inconsistent/unused
 * translation keys, broken local links, unused components and data sources, and packages imported by site code
 * without being declared in package.json.
 */
export async function checkProject(options: CheckOptions = {}): Promise<CheckReport> {
  const build = await runBuild({ outDir: options.outDir });
  const diagnostics: Array<Diagnostic> = [...build.diagnostics];
  const add = (diagnostic: Diagnostic) => diagnostics.push({ ...diagnostic, file: diagnostic.file ? relativeToRoot(diagnostic.file) : undefined });

  if (build.config) {
    const pages = new ListFiles(WORKING_DIR.out, file => file.endsWith('.html') || file.endsWith('.htm')).init();
    if (LANGS.length)
      checkTranslationAttributes(pages, add);
    if (options.links !== false)
      checkLinks(pages, add);
    checkTranslationFiles(build.translators, add);
    checkDependencies([...build.inputs.code, ...build.configFiles], add);

    const manifest = inspectProject();
    for (const component of manifest.components)
      if (!component.usedBy.length)
        add({ level: 'info', code: 'UNUSED_COMPONENT', file: component.file, message: `Component ${component.name} is not included by any page (it may be read by code).` });
    for (const source of manifest.dataSources)
      if (!source.usedBy.length)
        add({ level: 'info', code: 'UNUSED_DATA_SOURCE', file: source.file, message: `Data source ${source.name} is not used by any create-from-data-source directive (it may be read by code).` });
  }

  const counts = { error: 0, warning: 0, info: 0 };
  diagnostics.forEach(item => counts[item.level]++);
  return { ok: counts.error === 0, durationMs: build.durationMs, out: build.out, counts, diagnostics };
}

function relativeToRoot(file: string): string {
  const rel = relative(process.cwd(), file);
  return rel.startsWith('..') ? file : rel.split(sep).join('/');
}

function checkTranslationAttributes(pages: Array<string>, add: (diagnostic: Diagnostic) => void): void {
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    if (!html.includes('data-t') && !html.includes('data-attr-t'))
      continue;
    const left = new Set<string>();
    for (const element of parseElements(html))
      for (const attr of element.tag.attrs)
        if (attr.name === 'data-t' || attr.name === 'data-attr-t' || attr.name === 'data-t-interpolate')
          left.add(`<${element.tag.name} ${attr.name}${attr.value ? `="${attr.value}"` : ''}>`);
    if (left.size)
      add({
        level: 'error',
        code: 'I18N_UNTRANSLATED_ATTRIBUTE',
        file: page,
        message: `Translation attributes left in the output: ${[...left].slice(0, 5).join(', ')}${left.size > 5 ? ` (+${left.size - 5})` : ''}.`,
        hint: 'Pages outside the language folders (e.g. generated from a template without a language folder) are not translated.'
      });
  }
}

const LINK_ATTRIBUTES = ['href', 'src'];
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{|\$)/i;

function checkLinks(pages: Array<string>, add: (diagnostic: Diagnostic) => void): void {
  const out = WORKING_DIR.out;
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    const broken = new Set<string>();
    const lang = LANGS.find(candidate => page.startsWith(resolve(out, candidate) + sep));
    for (const element of parseElements(html)) {
      if (element.tag.name === 'link' && !element.tag.attrs.some(attr => attr.name === 'rel' && /stylesheet|icon|manifest|preload/.test(attr.value)))
        continue;
      for (const attr of element.tag.attrs) {
        if (!LINK_ATTRIBUTES.includes(attr.name) || !attr.value || EXTERNAL.test(attr.value.trim()))
          continue;
        const target = attr.value.trim().split('#')[0].split('?')[0];
        if (!target)
          continue;
        let decoded = target;
        try {
          decoded = decodeURI(target);
        } catch {
          // keep as it is
        }
        const candidates = decoded.startsWith('/')
          ? [resolve(out, `.${decoded}`), ...(lang ? [resolve(out, lang, `.${decoded}`)] : [])]
          : [resolve(dirname(page), decoded)];
        if (!candidates.some(exists))
          broken.add(attr.value);
      }
    }
    if (broken.size)
      add({
        level: 'warning',
        code: 'LINK_BROKEN',
        file: page,
        message: `Local link(s) to missing files: ${[...broken].slice(0, 8).join(', ')}${broken.size > 8 ? ` (+${broken.size - 8})` : ''}.`
      });
  }
}

function exists(path: string): boolean {
  return existsSync(path) || existsSync(`${path}.html`) || existsSync(resolve(path, 'index.html'));
}

function checkTranslationFiles(translators: Array<Translator>, add: (diagnostic: Diagnostic) => void): void {
  if (!LANGS.length)
    return;
  const keysByLang = new Map<string, Set<string>>();
  for (const lang of LANGS)
    keysByLang.set(lang, new Set(flattenKeys(Translator.readTranslations(resolve(WORKING_DIR.i18n, `${lang}.json`)))));
  const all = new Set<string>();
  keysByLang.forEach(keys => keys.forEach(key => all.add(key)));

  for (const [lang, keys] of keysByLang) {
    const missing = [...all].filter(key => !keys.has(key));
    if (missing.length)
      add({
        level: 'warning',
        code: 'I18N_INCONSISTENT_KEYS',
        file: resolve(WORKING_DIR.i18n, `${lang}.json`),
        message: `${missing.length} key(s) defined in other languages are missing in ${lang}.json: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`
      });
  }

  const used = new Set<string>();
  translators.forEach(translator => translator.usedKeys.forEach(key => used.add(key)));
  const unused = [...all].filter(key => !used.has(key));
  if (unused.length)
    add({
      level: 'info',
      code: 'I18N_UNUSED_KEY',
      message: `${unused.length} translation key(s) never used in the built pages (they may be used by browser scripts): ${unused.slice(0, 15).join(', ')}${unused.length > 15 ? ' …' : ''}`
    });
}

function checkDependencies(files: Array<string>, add: (diagnostic: Diagnostic) => void): void {
  for (const { pkg, file } of undeclaredImports(files))
    add({
      level: 'warning',
      code: 'UNDECLARED_DEPENDENCY',
      file,
      message: `"${pkg}" is imported but not declared in package.json.`,
      hint: FORMER_DEPENDENCIES.includes(pkg)
        ? `It works today only if something else installs it (yassb-web 1.x did). Add it: npm install --save-dev ${pkg}`
        : `Add it: npm install --save-dev ${pkg}`
    });
}

