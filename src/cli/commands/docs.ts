import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DIAGNOSTIC_CODES } from '../../diagnostics/diagnostics';
import type { ParsedArgs } from '../args';

/**
 * `yassb docs [topic] [--list]`: prints `docs/guide.md` (shipped with the package), or one of its sections.
 * Topics are the `## ` headings of the guide; `yassb docs diagnostics` lists the diagnostic codes.
 */
export function docsCommand(args: ParsedArgs): number {
  const guide = readFileSync(resolve(__dirname, '..', '..', '..', 'docs', 'guide.md'), 'utf8');
  const sections = splitSections(guide);
  const topic = args.positionals[0];

  if (args.flags.list === true || topic === 'list') {
    console.log('Topics (yassb docs <topic>):');
    sections.forEach(section => console.log(`  ${section.slug.padEnd(22)} ${section.title}`));
    return 0;
  }

  if (!topic) {
    console.log(guide);
    return 0;
  }

  const wanted = topic.toLowerCase();
  const exact = sections.filter(section => section.slug === wanted);
  const matches = exact.length ? exact : sections.filter(section => section.slug.includes(wanted) || section.title.toLowerCase().includes(wanted));
  if (!matches.length) {
    console.error(`No topic "${topic}". Run \`yassb docs --list\`.`);
    return 1;
  }
  console.log(matches.map(section => section.text).join('\n\n'));
  if (matches.some(section => section.slug === 'diagnostics')) {
    console.log('\nCodes:\n');
    for (const [code, description] of Object.entries(DIAGNOSTIC_CODES))
      console.log(`  ${code.padEnd(36)} ${description}`);
  }
  return 0;
}

interface Section {
  title: string;
  slug: string;
  text: string;
}

function splitSections(markdown: string): Array<Section> {
  const sections: Array<Section> = [];
  const parts = markdown.split(/^(?=## )/m);
  for (const part of parts) {
    const match = /^## (.+)$/m.exec(part);
    if (!match || !part.startsWith('## '))
      continue;
    const title = match[1].trim();
    sections.push({ title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), text: part.trim() });
  }
  return sections;
}
