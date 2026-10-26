import { formatDiagnostic } from '../../diagnostics/diagnostics';
import { DirectiveUse, inspectProject, ProjectManifest } from '../../inspect/project-inspector';
import { Translator } from '../../i18n/translator.class';
import { WORKING_DIR } from '../../config/working-dir.constant';
import type { ParsedArgs } from '../args';

/**
 * `yassb inspect [query] [--json]`: describes the project without building it.
 *
 * @feature cli.inspect
 * @summary yassb inspect [query]: describes the project without building it.
 * @usage yassb inspect   yassb inspect --json   yassb inspect news.json   yassb inspect HOME.TITLE
 * @options --json: full manifest (pages, templates, components, dataSources, renderers, customDirectives, postProcessors, hooks, assets, i18n, diagnostics); query: file, data source, renderer, directive or i18n key.
 * @rules Read-only: loads the configuration but runs no renderer and writes nothing; directives are listed with file:line, components transitively, LANG paths expanded for every language; problems visible statically (missing files, unknown renderers, invalid options) are listed; programmatic: inspectProject().
 * @errors none
 * @status stable
 * @since 2.0.0
 * @related cli.check, behaviour.diagnostics
 */
export function inspectCommand(args: ParsedArgs): number {
  const manifest = inspectProject();
  const query = args.positionals[0];

  if (args.flags.json === true) {
    console.log(JSON.stringify(query ? filterManifest(manifest, query) : manifest, null, 2));
    return 0;
  }

  console.log(query ? formatQuery(manifest, query) : formatManifest(manifest));
  return 0;
}

function formatManifest(m: ProjectManifest): string {
  const lines: Array<string> = [];
  const add = (line: string = '') => lines.push(line);

  add(`YASSB project ${m.project.name || ''}${m.project.version ? `@${m.project.version}` : ''} (yassb-web ${m.yassb.version})`);
  add(`Root: ${m.project.root}`);
  add(`Config: ${m.project.configFiles.join(', ') || '(none: defaults)'}`);
  add(`Languages: ${m.languages.length ? `${m.languages.join(', ')} (from ${m.folders.i18n}/*.json; first one served at /)` : 'single language (no i18n folder)'}`);
  add(`Output: ${m.folders.out}${m.languages.length ? '/<lang>/' : '/'}`);
  const scripts = Object.keys(m.project.scripts);
  if (scripts.length)
    add(`npm scripts: ${scripts.join(', ')}`);

  add();
  add('Folders:');
  for (const key of ['pages', 'components', 'dataSources', 'pagesToGenerate', 'i18n', 'assets', 'styles', 'scripts'])
    add(`  ${key.padEnd(16)}${m.folders[key]}`);

  add();
  add(`Pages (${m.pages.length}):`);
  for (const page of m.pages) {
    add(`  ${page.source}${page.title ? `  "${page.title}"` : ''}`);
    const data = page.directives.filter(use => use.type === 'create-from-data-source');
    if (page.components.length)
      add(`    components: ${page.components.join(', ')}`);
    if (data.length)
      add(`    data: ${data.map(use => `${use.target}→${use.renderer || 'basicElement'}`).join(', ')}`);
    const custom = countBy(page.directives.filter(use => !BUILT_IN_TYPES.has(use.type)).map(use => use.type));
    if (custom.length)
      add(`    custom directives: ${custom.join(', ')}`);
    if (page.i18nKeys.length)
      add(`    i18n keys in HTML: ${page.i18nKeys.length}`);
  }

  if (m.templates.length) {
    add();
    add(`Generated pages (generate-from-files):`);
    for (const template of m.templates)
      add(`  ${template.source} ← ${template.from || '(no directive)'}: ${template.pages.length} page(s)${template.pages.length ? `, e.g. ${template.pages[0].output}` : ''}`);
  }

  add();
  const unusedComponents = m.components.filter(component => !component.usedBy.length);
  add(`Components (${m.components.length})${unusedComponents.length ? `, not used by any page: ${unusedComponents.map(c => c.name).join(', ')}` : ''}`);

  add();
  add(`Data sources (${m.dataSources.length}):`);
  for (const source of m.dataSources)
    add(`  ${source.name.padEnd(32)} ${source.shape}${source.usedBy.length ? `  ← ${source.usedBy.map(use => `${use.file}:${use.line}`).join(', ')}` : '  (not used in HTML)'}`);

  add();
  add('Renderers:');
  for (const renderer of m.renderers)
    add(`  ${renderer.name.padEnd(28)} ${renderer.builtIn ? 'built-in' : 'custom  '}  used ${renderer.usedBy.length}×`);

  if (m.customDirectives.length) {
    add();
    add('Custom directives (run after the built-in ones, in this order):');
    for (const directive of m.customDirectives)
      add(`  ${directive.name}  ${directive.regex}  used ${directive.uses.length}×`);
  }

  if (m.postProcessors.length || m.hooks.length) {
    add();
    if (m.postProcessors.length)
      add(`Post processors: ${m.postProcessors.join(', ')}`);
    if (m.hooks.length)
      add(`Hooks: ${m.hooks.join(', ')}`);
  }

  add();
  add(`Styles: ${m.assets.styles.entry} → ${m.assets.styles.output} (${m.assets.styles.compiler})`);
  add(`Scripts: ${m.assets.scripts.entry} → ${m.assets.scripts.output} (${m.assets.scripts.bundler})`);
  add(`Assets: ${m.assets.assetsFolder} (${m.assets.assetFiles} files, copied as they are)`);

  if (m.languages.length) {
    add();
    add(`i18n: ${Object.entries(m.i18n.keys).map(([lang, count]) => `${lang} ${count} keys`).join(', ')}; ${m.i18n.usedInSources.length} keys referenced in HTML sources`);
    for (const [lang, keys] of Object.entries(m.i18n.missing))
      if (keys.length)
        add(`  missing in ${lang}: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ` (+${keys.length - 10})` : ''}`);
    if (m.i18n.inconsistent.length)
      add(`  not in every language: ${m.i18n.inconsistent.slice(0, 10).join(', ')}${m.i18n.inconsistent.length > 10 ? ` (+${m.i18n.inconsistent.length - 10})` : ''}`);
  }

  if (m.diagnostics.length) {
    add();
    add(`Problems found without building (${m.diagnostics.length}):`);
    m.diagnostics.slice(0, 20).forEach(diagnostic => add(formatDiagnostic(diagnostic).split('\n').map(line => `  ${line}`).join('\n')));
  }

  add();
  add('More: `yassb inspect <file|data source|renderer|i18n key>`, `yassb inspect --json`, `yassb check`, `yassb docs`.');
  return lines.join('\n');
}

const BUILT_IN_TYPES = new Set(['component', 'create-from-data-source', 'public-file-list', 'url-to', 'include-script-src', 'include-styles-src', 'generate-from-files']);

function countBy(items: Array<string>): Array<string> {
  const counts = new Map<string, number>();
  items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts].map(([item, count]) => `${item}×${count}`);
}

/** Everything in the manifest that mentions `query`. */
function filterManifest(m: ProjectManifest, query: string): object {
  const q = query.toLowerCase();
  const has = (value: unknown) => JSON.stringify(value).toLowerCase().includes(q);
  return {
    query,
    pages: m.pages.filter(page => page.source.toLowerCase().includes(q) || page.components.some(c => c.toLowerCase().includes(q)) || page.directives.some(has) || page.i18nKeys.includes(query)),
    templates: m.templates.filter(has),
    components: m.components.filter(has),
    dataSources: m.dataSources.filter(has),
    renderers: m.renderers.filter(has),
    customDirectives: m.customDirectives.filter(has),
    translations: translationsOf(m, query),
    diagnostics: m.diagnostics.filter(has)
  };
}

function translationsOf(m: ProjectManifest, key: string): { [lang: string]: string | undefined } | undefined {
  if (!m.languages.length)
    return undefined;
  const result: { [lang: string]: string | undefined } = {};
  for (const lang of m.languages)
    result[lang] = new Translator(WORKING_DIR.i18n, lang).lookup(key);
  return Object.values(result).some(value => value !== undefined) ? result : undefined;
}

function formatQuery(m: ProjectManifest, query: string): string {
  const found = filterManifest(m, query) as {
    pages: ProjectManifest['pages']; templates: ProjectManifest['templates']; components: ProjectManifest['components'];
    dataSources: ProjectManifest['dataSources']; renderers: ProjectManifest['renderers']; customDirectives: ProjectManifest['customDirectives'];
    translations?: { [lang: string]: string | undefined }; diagnostics: ProjectManifest['diagnostics'];
  };
  const lines: Array<string> = [`Results for "${query}":`];
  const q = query.toLowerCase();
  const uses = (list: Array<DirectiveUse>) => list.filter(use => JSON.stringify(use).toLowerCase().includes(q));

  if (found.translations) {
    lines.push('', 'Translation:');
    for (const [lang, value] of Object.entries(found.translations))
      lines.push(`  ${lang}: ${value === undefined ? '(missing)' : JSON.stringify(value)}`);
  }
  for (const source of found.dataSources) {
    lines.push('', `Data source ${source.name} (${source.file}): ${source.shape}`);
    source.usedBy.forEach(use => lines.push(`  used by ${use.file}:${use.line} with renderer ${use.renderer || 'basicElement'}`));
  }
  for (const renderer of found.renderers) {
    const all = renderer.name.toLowerCase().includes(q);
    lines.push('', `Renderer ${renderer.name} (${renderer.builtIn ? 'built-in' : 'custom, see config.customRenderers'})`);
    renderer.usedBy.filter(use => all || JSON.stringify(use).toLowerCase().includes(q))
      .forEach(use => lines.push(`  used by ${use.file}:${use.line}${use.target ? ` on ${use.target}` : ''}`));
  }
  for (const component of found.components)
    lines.push('', `Component ${component.name} (${component.file})`, `  included by: ${component.usedBy.join(', ') || 'nothing'}`);
  for (const directive of found.customDirectives) {
    const all = directive.name.toLowerCase().includes(q);
    lines.push('', `Custom directive ${directive.name} ${directive.regex}`);
    (all ? directive.uses : uses(directive.uses)).forEach(use => lines.push(`  ${use.file}:${use.line}  ${use.text}`));
  }
  for (const page of found.pages) {
    lines.push('', `Page ${page.source} → ${page.outputs.join(', ')}`);
    const matching = page.source.toLowerCase().includes(q) ? page.directives : uses(page.directives);
    matching.forEach(use => lines.push(`  ${use.file}:${use.line}  ${use.text}${use.exists === false ? '  (MISSING)' : ''}`));
    if (page.i18nKeys.includes(query))
      lines.push(`  uses i18n key ${query}`);
  }
  for (const template of found.templates)
    lines.push('', `Template ${template.source} ← ${template.from}`, ...template.pages.map(page => `  ${page.source} → ${page.output}`));
  for (const diagnostic of found.diagnostics)
    lines.push('', formatDiagnostic(diagnostic));
  if (lines.length === 1)
    lines.push('  nothing found. Try a file name, a data source, a renderer name or an i18n key.');
  return lines.join('\n');
}

