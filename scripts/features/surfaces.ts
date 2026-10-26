/**
 * Reads the user-facing surfaces of the engine from its own registries, so the catalogue check knows what must
 * have a feature without guessing.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BUILT_IN_DIRECTIVES } from '../../src/config/supported-directives.const';
import { DIAGNOSTIC_CODES } from '../../src/diagnostics/diagnostics';
import { DirectivesParser } from '../../src/directives/directives-parser.class';
import { TemplateToHtmlFiles } from '../../src/directives/pages-generator/template-to-html-files.class';
import { BUILT_IN_RENDERERS } from '../../src/renderers/renderers-store.constant';
import type { Surfaces } from './feature-check';

export function readSurfaces(root: string): Surfaces {
  const types = readFileSync(join(root, 'src/yassb.ts'), 'utf8');
  const configBody = /export interface YassbConfig \{([\s\S]*?)\n\}/.exec(types)?.[1] || '';
  const configOptions = [...configBody.matchAll(/^ {2}([A-Za-z_$][\w$]*)\??:/gm)].map(match => match[1]);

  const cli = readFileSync(join(root, 'src/cli/cli.ts'), 'utf8');
  const commandNames = [...cli.matchAll(/case '([a-z][a-z-]*)':/g)].map(match => match[1]).filter(name => name !== 'help');
  const commands = commandNames.map(name => {
    const file = join(root, 'src/cli/commands', `${name}.ts`);
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      // command without its own file
    }
    const flags = [...new Set([...text.matchAll(/args\.flags\.([a-zA-Z]+)/g)].map(match => match[1]))];
    return { name, flags };
  });

  return {
    directiveClasses: [...BUILT_IN_DIRECTIVES.map(directive => directive.name), DirectivesParser.name, TemplateToHtmlFiles.name],
    rendererNames: Object.keys(BUILT_IN_RENDERERS),
    configOptions,
    commands,
    diagnosticCodes: Object.keys(DIAGNOSTIC_CODES)
  };
}
