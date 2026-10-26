/**
 * Compatibility with yassb-web 1.4.3: `test/fixtures/kitchen-sink` (which uses every feature of the engine) is
 * built and compared with `expected-1.4.3/`, the output of 1.4.3 for the same sources. Pages are compared as
 * DOM (elements, attributes, visible text). The only allowed differences are the documented 1.x bugs below.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { compareSites } from './helpers/compare-sites';
import { copyFixture, removeFixture, ROOT, runCli, Runtime } from './helpers/fixture';

const ALLOWED_HUNKS = new Set([
  // 1.x let `String.replace` interpret `$$` in Markdown content.
  ['#and $ dollars.', '#and $$ dollars.'],
  // Nested translation keys (new): 1.x left the base text.
  ['#Nested', '#Nested key'],
  ['#Nested', '#Chiave annidata'],
  // `options` with arrays: 1.x silently dropped the whole block.
  ['', '<span class="a b" data-x="1"> #One <b > #bold </b> </span> <span class="a b" data-x="1"> #Two </span>'],
  ['', '<span class="a b" data-x="1"> #Uno <b > #grassetto </b> </span> <span class="a b" data-x="1"> #Due </span>'],
  ['', '<article class="person"> <h3 > #Bea </h3> <p > #Design & more </p> </article> <article class="person"> <h3 > #Al </h3> <p > #Dev & more </p> </article>'],
  // basicElement without `tag`: 1.x wrote <undefined> elements; the documented default is span.
  ['<undefined >', '<span >'],
  ['</undefined> <undefined >', '</span> <span >'],
  ['</undefined>', '</span>']
].map(pair => JSON.stringify(pair)));

const dirs: Array<string> = [];
afterAll(() => dirs.forEach(removeFixture));

describe.each(['node', 'bun'] as Array<Runtime>)('kitchen-sink vs 1.4.3 (%s)', runtime => {
  test('same pages as 1.4.3, except documented fixes', () => {
    const dir = copyFixture('kitchen-sink');
    dirs.push(dir);
    const result = runCli(dir, ['build'], runtime);
    expect(result.status).toBe(0);

    const differences = compareSites(join(ROOT, 'test/fixtures/kitchen-sink/expected-1.4.3'), join(dir, 'dist/public'), {
      skip: file => file.endsWith('.js')
    });
    const unexpected: Array<string> = [];
    for (const difference of differences) {
      if (difference.kind !== 'html') {
        unexpected.push(`${difference.kind} ${difference.file}`);
        continue;
      }
      for (const hunk of difference.hunks || [])
        if (!ALLOWED_HUNKS.has(JSON.stringify([hunk.removed.join(' '), hunk.added.join(' ')])))
          unexpected.push(`${difference.file}\n  - ${hunk.removed.join(' ')}\n  + ${hunk.added.join(' ')}`);
    }
    expect(unexpected).toEqual([]);

    // The bundle exists and runs the site's code.
    const bundle = join(dir, 'dist/public/assets/js/main-1-2-3.min.js');
    expect(existsSync(bundle)).toBe(true);
    expect(readFileSync(bundle, 'utf8')).toContain('kitchen');
    // No sitemap without siteHost, as in 1.x.
    expect(existsSync(join(dir, 'dist/public/sitemap.xml'))).toBe(false);
  }, 120000);
});
