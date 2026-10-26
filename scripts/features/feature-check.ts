/**
 * Feature catalogue of YASSB: collects `@feature` tags from the sources and checks that the catalogue is complete
 * and documented. Run by `bun run build` (scripts/check-features.ts) and by the tests.
 *
 * Rules (see AGENTS.md → "Feature catalogue"):
 * 1. Every exported declaration in `src/` (and every option of `YassbConfig`) declares exactly one of
 *    `@feature <id>`, `@featurePart <id>` or `@internal`.
 * 2. A `@feature` has the fields `@summary @usage @options @rules @errors @status @since` (`none` allowed for
 *    options and errors); ids are `<kind>.<name>`, unique; `@featurePart`/`@related` point to existing ids.
 * 3. Surfaces are complete: built-in directives, built-in renderers, `YassbConfig` options and CLI commands each
 *    have their feature; every CLI flag read by a command is listed in that command's `@options`; every
 *    diagnostic code is listed in the `@errors` of a feature, and every listed code exists.
 * 4. Every feature id is referenced in each docs target with `<!-- feature: id -->`; references to unknown ids
 *    are errors.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

export const FEATURE_KINDS = ['directive', 'renderer', 'config', 'cli', 'i18n', 'content', 'assets', 'api', 'behaviour'] as const;
export const FEATURE_STATUSES = ['stable', 'experimental', 'legacy', 'deprecated'] as const;
const REQUIRED_FIELDS = ['summary', 'usage', 'options', 'rules', 'errors', 'status', 'since'] as const;

export interface Feature {
  id: string;
  kind: string;
  summary: string;
  usage: string;
  options: string;
  rules: string;
  errors: Array<string>;
  status: string;
  since: string;
  related: Array<string>;
  /** Where the feature is defined. */
  source: { file: string; line: number; symbol: string };
  /** Other symbols implementing part of the feature. */
  parts: Array<{ file: string; line: number; symbol: string }>;
}

export interface Declaration {
  file: string;
  line: number;
  symbol: string;
  kind: string;
  tags: { [tag: string]: Array<string> };
}

export interface FeatureCheckResult {
  features: Array<Feature>;
  declarations: Array<Declaration>;
  errors: Array<string>;
  warnings: Array<string>;
}

export interface FeatureCheckConfig {
  sources: string;
  manifest: string;
  docs: Array<{ path: string; enforce: boolean }>;
}

/** Surfaces of the engine, read from its registries. */
export interface Surfaces {
  directiveClasses: Array<string>;
  rendererNames: Array<string>;
  configOptions: Array<string>;
  commands: Array<{ name: string; flags: Array<string> }>;
  diagnosticCodes: Array<string>;
}

// ---------------------------------------------------------------------------------------------------------
// Parsing

const DECLARATION = /^export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

/** Exported declarations of one file, with the tags of the JSDoc block right before them. */
export function parseDeclarations(file: string, text: string): Array<Declaration> {
  const declarations: Array<Declaration> = [];
  const lines = text.split('\n');
  let offset = 0;
  const lineStarts = lines.map(line => {
    const start = offset;
    offset += line.length + 1;
    return start;
  });

  lines.forEach((line, index) => {
    const match = DECLARATION.exec(line);
    if (!match)
      return;
    declarations.push({ file, line: index + 1, symbol: match[2], kind: match[1], tags: tagsBefore(text, lineStarts[index]) });
  });

  // Options of YassbConfig are surfaces too.
  const config = /^export interface YassbConfig \{/m.exec(text);
  if (config) {
    const bodyStart = config.index + config[0].length;
    const body = text.slice(bodyStart, findClosingBrace(text, bodyStart - 1));
    const property = /^ {2}([A-Za-z_$][\w$]*)\??:/gm;
    let found: RegExpExecArray | null;
    while ((found = property.exec(body))) {
      const absolute = bodyStart + found.index;
      declarations.push({
        file,
        line: text.slice(0, absolute).split('\n').length,
        symbol: `YassbConfig.${found[1]}`,
        kind: 'option',
        tags: tagsBefore(text, absolute)
      });
    }
  }
  return declarations;
}

function findClosingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{')
      depth++;
    else if (text[i] === '}' && --depth === 0)
      return i;
  }
  return text.length;
}

/** Tags of the JSDoc block that ends right before `position` (only whitespace in between). */
function tagsBefore(text: string, position: number): { [tag: string]: Array<string> } {
  const before = text.slice(0, position).replace(/\s+$/, '');
  if (!before.endsWith('*/'))
    return {};
  const start = before.lastIndexOf('/**');
  if (start < 0)
    return {};
  return parseTags(before.slice(start + 3, -2));
}

/** `@tag value` pairs of a JSDoc body; a value continues on the following lines until the next tag. */
export function parseTags(body: string): { [tag: string]: Array<string> } {
  const tags: { [tag: string]: Array<string> } = {};
  let current: { name: string; lines: Array<string> } | undefined;
  const flush = () => {
    if (current)
      (tags[current.name] = tags[current.name] || []).push(current.lines.join('\n').trim());
  };
  for (const raw of body.split('\n')) {
    const line = raw.replace(/^\s*\*? ?/, '');
    const tag = /^@(\w+)\s?(.*)$/.exec(line);
    if (tag) {
      flush();
      current = { name: tag[1], lines: [tag[2]] };
    } else if (current)
      current.lines.push(line);
  }
  flush();
  return tags;
}

function listSourceFiles(dir: string): Array<string> {
  const files: Array<string> = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory())
      files.push(...listSourceFiles(path));
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts'))
      files.push(path);
  }
  return files;
}

// ---------------------------------------------------------------------------------------------------------
// Checks

export function checkFeatures(root: string, config: FeatureCheckConfig, surfaces: Surfaces): FeatureCheckResult {
  const errors: Array<string> = [];
  const warnings: Array<string> = [];
  const declarations: Array<Declaration> = [];
  for (const file of listSourceFiles(join(root, config.sources)))
    declarations.push(...parseDeclarations(relative(root, file), readFileSync(file, 'utf8')));

  const where = (declaration: Declaration) => `${declaration.file}:${declaration.line} ${declaration.symbol}`;
  const features = new Map<string, Feature>();
  const parts: Array<{ id: string; declaration: Declaration }> = [];
  const symbolFeature = new Map<string, string>();

  // Rule 1 and 2.
  for (const declaration of declarations) {
    const decisions = ['feature', 'featurePart', 'internal'].filter(tag => declaration.tags[tag]);
    if (decisions.length !== 1) {
      errors.push(decisions.length
        ? `${where(declaration)}: use only one of @feature, @featurePart, @internal (found ${decisions.map(tag => `@${tag}`).join(', ')}).`
        : `${where(declaration)}: missing @feature, @featurePart or @internal. Is it part of what site authors can see or use?`);
      continue;
    }
    if (declaration.tags.featurePart) {
      parts.push({ id: declaration.tags.featurePart[0].trim(), declaration });
      continue;
    }
    if (!declaration.tags.feature)
      continue;

    const tags = declaration.tags;
    const id = tags.feature[0].trim();
    const [kind] = id.split('.');
    if (!/^[a-z0-9]+\.[A-Za-z0-9-]+$/.test(id) || !(FEATURE_KINDS as ReadonlyArray<string>).includes(kind))
      errors.push(`${where(declaration)}: feature id "${id}" must be <kind>.<name> with kind in ${FEATURE_KINDS.join(', ')}.`);
    if (features.has(id)) {
      errors.push(`${where(declaration)}: feature "${id}" is already defined at ${features.get(id)!.source.file}:${features.get(id)!.source.line}.`);
      continue;
    }
    for (const field of REQUIRED_FIELDS)
      if (!tags[field] || !tags[field][0].trim())
        errors.push(`${where(declaration)}: feature "${id}" has no @${field}.`);
    const status = (tags.status?.[0] || '').trim();
    if (status && !(FEATURE_STATUSES as ReadonlyArray<string>).includes(status))
      errors.push(`${where(declaration)}: @status of "${id}" must be one of ${FEATURE_STATUSES.join(', ')}.`);
    const since = (tags.since?.[0] || '').trim();
    if (since && !/^\d+\.\d+\.\d+$/.test(since))
      errors.push(`${where(declaration)}: @since of "${id}" must be a version like 2.0.0.`);

    features.set(id, {
      id,
      kind,
      summary: (tags.summary?.[0] || '').trim(),
      usage: (tags.usage?.[0] || '').trim(),
      options: (tags.options?.[0] || '').trim(),
      rules: (tags.rules?.[0] || '').trim(),
      errors: splitList(tags.errors?.[0]),
      status,
      since,
      related: splitList(tags.related?.[0]),
      source: { file: declaration.file, line: declaration.line, symbol: declaration.symbol },
      parts: []
    });
    symbolFeature.set(declaration.symbol, id);
  }

  for (const { id, declaration } of parts) {
    const feature = features.get(id);
    if (!feature)
      errors.push(`${where(declaration)}: @featurePart points to unknown feature "${id}".`);
    else
      feature.parts.push({ file: declaration.file, line: declaration.line, symbol: declaration.symbol });
  }
  for (const feature of features.values())
    for (const related of feature.related)
      if (!features.has(related))
        errors.push(`${feature.source.file}:${feature.source.line}: @related of "${feature.id}" points to unknown feature "${related}".`);

  // Rule 3: surfaces.
  const requireFeature = (symbol: string, kind: string, label: string) => {
    const id = symbolFeature.get(symbol);
    if (!id)
      errors.push(`${label} must define a @feature (on ${symbol}).`);
    else if (!id.startsWith(`${kind}.`))
      errors.push(`${label}: feature "${id}" on ${symbol} must be of kind "${kind}".`);
    return id;
  };
  for (const name of surfaces.directiveClasses)
    requireFeature(name, 'directive', `Built-in directive ${name}`);
  for (const name of surfaces.rendererNames) {
    const id = requireFeature(name, 'renderer', `Built-in renderer ${name}`);
    if (id && id !== `renderer.${name}`)
      errors.push(`Built-in renderer ${name}: its feature id must be "renderer.${name}" (found "${id}").`);
  }
  for (const option of surfaces.configOptions) {
    const id = requireFeature(`YassbConfig.${option}`, 'config', `Configuration option ${option}`);
    if (id && id !== `config.${option}`)
      errors.push(`Configuration option ${option}: its feature id must be "config.${option}" (found "${id}").`);
  }
  for (const command of surfaces.commands) {
    const feature = features.get(`cli.${command.name}`);
    if (!feature) {
      errors.push(`CLI command "${command.name}" has no feature "cli.${command.name}".`);
      continue;
    }
    for (const flag of command.flags)
      if (!new RegExp(`--${flag}\\b`).test(feature.options))
        errors.push(`CLI command "${command.name}" reads --${flag}, which is not listed in @options of "cli.${command.name}".`);
  }
  const assigned = new Set<string>();
  for (const feature of features.values())
    for (const code of feature.errors) {
      assigned.add(code);
      if (!surfaces.diagnosticCodes.includes(code))
        errors.push(`${feature.source.file}:${feature.source.line}: @errors of "${feature.id}" lists unknown diagnostic code ${code}.`);
    }
  for (const code of surfaces.diagnosticCodes)
    if (!assigned.has(code))
      errors.push(`Diagnostic code ${code} is not listed in the @errors of any feature.`);

  // Rule 4: documentation coverage.
  for (const target of config.docs) {
    const path = join(root, target.path);
    if (!existsSync(path)) {
      (target.enforce ? errors : warnings).push(`Docs target ${target.path} does not exist.`);
      continue;
    }
    const referenced = collectReferences(path);
    for (const [id, files] of referenced)
      if (!features.has(id))
        errors.push(`${files[0]} references unknown feature "${id}".`);
    const missing = [...features.keys()].filter(id => !referenced.has(id));
    if (missing.length)
      (target.enforce ? errors : warnings).push(`${target.path} does not reference ${missing.length} feature(s): ${missing.join(', ')}`);
  }

  return { features: [...features.values()].sort((a, b) => a.id.localeCompare(b.id)), declarations, errors, warnings };
}

function splitList(value: string | undefined): Array<string> {
  if (!value || value.trim() === 'none')
    return [];
  return value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean);
}

/** `<!-- feature: a.b, c.d -->` markers in a file or folder of Markdown/HTML. */
export function collectReferences(path: string): Map<string, Array<string>> {
  const references = new Map<string, Array<string>>();
  const files = statSync(path).isDirectory() ? listDocFiles(path) : [path];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/<!--\s*features?:\s*([^>]*?)\s*-->/g))
      for (const id of match[1].split(/[\s,]+/).filter(Boolean))
        references.set(id, [...(references.get(id) || []), file]);
  }
  return references;
}

function listDocFiles(dir: string): Array<string> {
  const files: Array<string> = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory())
      files.push(...listDocFiles(path));
    else if (/\.(md|html|txt)$/.test(entry))
      files.push(path);
  }
  return files;
}
