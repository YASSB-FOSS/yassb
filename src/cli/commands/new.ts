import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { workingDirSetter } from '../../config/working-dir-setter.function';
import { camelToKebabCase } from '../../tools/strings-formatters/camel-to-kebab-case.function';
import { c, failLine, glyph, printBanner } from '../../tools/terminal';
import type { ParsedArgs } from '../args';
import { version } from '../cli';

/**
 * `yassb new <name>`: creates `./<name>` from `templates/starter`, with the standard folders.
 * `PROJECT_NAME` and `YASSB_VERSION` are replaced in the template files.
 *
 * @feature cli.new
 * @summary yassb new <name>: creates a project from the starter.
 * @usage yassb new my-site
 * @options name (required): converted to kebab-case for the folder and package name.
 * @rules Refuses a non-empty existing folder; the starter has config/default.ts, a renderer in builder/, a data source, components, Sass and TypeScript entries, AGENTS.md and CLAUDE.md for coding agents, and yassb-web as devDependency.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related config.files
 */
export function newCommand(args: ParsedArgs): number {
  printBanner('new');
  const name = args.positionals[0];
  if (!name) {
    console.error(failLine(`You must provide a name for the project. Example: ${c.bold('yassb new my-site')}`));
    return 1;
  }
  const projectName = camelToKebabCase(name);
  const target = resolve(process.cwd(), projectName);
  if (existsSync(target) && readdirSync(target).length) {
    console.error(failLine(`Folder ${target} already exists and is not empty.`));
    return 1;
  }

  const template = resolve(__dirname, '..', '..', '..', 'templates', 'starter');
  cpSync(template, target, { recursive: true });
  // npm drops files named .gitignore from packages: the template stores it as "gitignore".
  if (existsSync(resolve(target, 'gitignore')))
    renameSync(resolve(target, 'gitignore'), resolve(target, '.gitignore'));
  replaceInTree(target, { PROJECT_NAME: projectName, YASSB_VERSION: version() });
  workingDirSetter({ base: target }, true);

  const command = (text: string, comment = '') => `    ${c.dim('$')} ${c.accent(text)}${comment ? `  ${c.dim(comment)}` : ''}`;
  console.log([
    `  ${glyph.ok} created ${c.bold(`${projectName}/`)}`,
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
