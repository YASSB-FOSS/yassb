import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { workingDirSetter } from '../../config/working-dir-setter.function';
import { camelToKebabCase } from '../../tools/strings-formatters/camel-to-kebab-case.function';
import { c, failLine, glyph, printBanner } from '../../tools/terminal';
import type { ParsedArgs } from '../args';
import type { WorkingDirConfig } from '../../yassb';
import { version } from '../cli';

const TEMPLATES = resolve(__dirname, '..', '..', '..', 'templates');

/**
 * Axes of a project: `templates/base`, then one preset per axis, in this order. Each layer owns its files: two
 * layers writing the same file is a bug of the templates, caught before anything is written.
 */
const AXES: Array<{ axis: 'styles' | 'scripts' | 'deploy'; fallback?: string }> = [
  { axis: 'styles', fallback: 'sass' },
  { axis: 'scripts', fallback: 'typescript' },
  { axis: 'deploy' }
];

/** `preset.json` of a preset folder. */
interface PresetManifest {
  description: string;
  dependencies?: { [name: string]: string };
  devDependencies?: { [name: string]: string };
  /** Configuration options written into config/default.ts (JSON values only). */
  config?: { [option: string]: unknown };
  /** Entries the preset moves (e.g. `styles: 'styles/styles.css'`), as set by its builder/styles.ts. */
  workingDir?: Partial<WorkingDirConfig>;
  /** Lines added to the "Setup" section of AGENTS.md. */
  agents?: Array<string>;
}

/**
 * `yassb new <name>`: creates `./<name>` from `templates/base` plus one preset per axis (styles, scripts,
 * deploy). `PROJECT_NAME`, `YASSB_VERSION`, `SETUP_NOTES` and the `PRESET_OPTIONS` line are replaced in the
 * template files.
 *
 * @feature cli.new
 * @summary yassb new <name>: creates a project from the starter, with a styles, scripts and deploy preset.
 * @usage yassb new my-site --styles tailwind --scripts alpine --deploy github-pages
 * @options name (required): converted to kebab-case for the folder and package name. --styles sass (default), tailwind, css, bootstrap, pico. --scripts typescript (default), alpine. --deploy github-pages, netlify (default: none).
 * @rules Refuses a non-empty existing folder and unknown presets (the error lists the available ones); without flags the project uses Sass and TypeScript and has no deploy files. Every project has config/default.ts, a renderer in builder/, builder/styles.ts (spread into the configuration), a data source, components, AGENTS.md and CLAUDE.md for coding agents, and yassb-web as devDependency. A styles preset brings its own pages and components; github-pages sets relativeUrls: true in config/default.ts; the presets' packages are added to devDependencies (run npm install); AGENTS.md lists the chosen setup. Template names starting with dot- become dot files (dot-gitignore → .gitignore).
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related config.files, config.stylesParser, config.relativeUrls
 */
export function newCommand(args: ParsedArgs): number {
  printBanner('new');
  const name = args.positionals[0];
  if (!name) {
    console.error(failLine(`You must provide a name for the project. Example: ${c.bold('yassb new my-site')}`));
    return 1;
  }

  const requested: { [axis: string]: string | boolean | undefined } = {
    styles: args.flags.styles,
    scripts: args.flags.scripts,
    deploy: args.flags.deploy
  };
  const chosen: Array<{ axis: string; preset: string; dir: string; manifest: PresetManifest }> = [];
  for (const { axis, fallback } of AXES) {
    const value = requested[axis] ?? fallback;
    if (value === undefined || (value === false && !fallback))
      continue;
    const available = listPresets(axis);
    if (typeof value !== 'string' || !available.includes(value)) {
      const given = typeof value !== 'string' ? 'needs a value' : `"${value}" is not a preset`;
      console.error(failLine(`--${axis} ${given}. Available: ${available.join(', ')}.`));
      return 1;
    }
    const dir = join(TEMPLATES, axis, value);
    chosen.push({ axis, preset: value, dir, manifest: JSON.parse(readFileSync(join(dir, 'preset.json'), 'utf8')) });
  }

  const projectName = camelToKebabCase(name);
  const target = resolve(process.cwd(), projectName);
  if (existsSync(target) && readdirSync(target).length) {
    console.error(failLine(`Folder ${target} already exists and is not empty.`));
    return 1;
  }

  // Plan every copy first, so a conflict between layers writes nothing.
  const files = new Map<string, { source: string; layer: string }>();
  const layers = [{ label: 'base', dir: join(TEMPLATES, 'base') }, ...chosen.map(item => ({ label: `${item.axis}/${item.preset}`, dir: item.dir }))];
  for (const layer of layers)
    for (const file of listLayerFiles(layer.dir)) {
      const owner = files.get(file.output);
      if (owner) {
        console.error(failLine(`Template conflict: ${file.output} is in both ${owner.layer} and ${layer.label}.`));
        return 1;
      }
      files.set(file.output, { source: file.source, layer: layer.label });
    }
  for (const [output, { source }] of files) {
    mkdirSync(dirname(join(target, output)), { recursive: true });
    copyFileSync(source, join(target, output));
  }

  const notes = chosen.flatMap(item => item.manifest.agents || []).map(line => `- ${line}`).join('\n');
  const options = chosen.filter(item => item.manifest.config).map(item => [
    `  // From the ${item.preset} preset (see AGENTS.md → Setup).`,
    ...Object.entries(item.manifest.config!).map(([option, value]) => `  ${option}: ${JSON.stringify(value)},`)
  ].join('\n'));
  replaceInTree(target, {
    PROJECT_NAME: projectName,
    YASSB_VERSION: version(),
    SETUP_NOTES: notes,
    'PRESET_OPTIONS\n': options.map(lines => `${lines}\n`).join('')
  });
  mergePackageJson(join(target, 'package.json'), chosen.map(item => item.manifest));
  workingDirSetter(Object.assign({}, ...chosen.map(item => item.manifest.workingDir), { base: target }), true);

  const command = (text: string, comment = '') => `    ${c.dim('$')} ${c.accent(text)}${comment ? `  ${c.dim(comment)}` : ''}`;
  console.log([
    `  ${glyph.ok} created ${c.bold(`${projectName}/`)}`,
    ...chosen.map(item => `    ${c.dim(`${item.axis.padEnd(8)}`)}${item.preset} ${c.dim(`— ${item.manifest.description}`)}`),
    '',
    `  ${c.bold('NEXT STEPS')}`,
    '',
    command(`cd ${projectName}`),
    command('npm install'),
    command('npm run watch', '→ http://localhost:3000'),
    '',
    `  ${c.dim('coding agents: read AGENTS.md, then run')} ${c.accent('npx yassb docs')} ${c.dim('and')} ${c.accent('npx yassb inspect')}`,
    ''
  ].join('\n'));
  return 0;
}

/** Presets of an axis: folders of `templates/<axis>` with a `preset.json`. */
function listPresets(axis: string): Array<string> {
  const dir = join(TEMPLATES, axis);
  return readdirSync(dir).filter(entry => existsSync(join(dir, entry, 'preset.json'))).sort();
}

/**
 * Files of a layer with their path in the project. npm drops some dot files from packages, so templates store
 * them as `dot-<name>` (`dot-gitignore`, `dot-github/`).
 */
function listLayerFiles(root: string, dir: string = root, prefix: string = ''): Array<{ source: string; output: string }> {
  const files: Array<{ source: string; output: string }> = [];
  for (const entry of readdirSync(dir).sort()) {
    const source = join(dir, entry);
    if (dir === root && entry === 'preset.json')
      continue;
    const output = prefix + (entry.startsWith('dot-') ? `.${entry.slice(4)}` : entry);
    if (statSync(source).isDirectory())
      files.push(...listLayerFiles(root, source, `${output}/`));
    else
      files.push({ source, output });
  }
  return files;
}

/** Adds the presets' packages to the project's package.json, sorted by name. */
function mergePackageJson(path: string, manifests: Array<PresetManifest>): void {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  for (const field of ['dependencies', 'devDependencies'] as const) {
    const merged = { ...pkg[field] };
    for (const manifest of manifests)
      Object.assign(merged, manifest[field]);
    if (Object.keys(merged).length)
      pkg[field] = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function replaceInTree(dir: string, values: { [placeholder: string]: string }): void {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) {
      replaceInTree(path, values);
      continue;
    }
    let text = readFileSync(path, 'utf8');
    let changed = false;
    for (const [placeholder, value] of Object.entries(values))
      if (text.includes(placeholder)) {
        text = text.split(placeholder).join(value);
        changed = true;
      }
    if (changed)
      writeFileSync(path, text);
  }
}
