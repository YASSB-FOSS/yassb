/**
 * Compares two built sites. HTML pages are compared as a normalized sequence of elements, attributes and
 * visible text (quoting, entity encoding, whitespace and implied <html>/<head>/<body>/<tbody> tags ignored),
 * so that outputs that render the same DOM compare equal. Other files are compared byte by byte.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { decodeEntities, tokenize } from '../../src/html/html-scanner';

const IMPLIED = new Set(['html', 'head', 'body', 'tbody']);

export function normalizeHtml(html: string, ignore: (tag: string, attrs: string) => boolean = () => false): Array<string> {
  const out: Array<string> = [];
  let skipDepth = 0;
  for (const token of tokenize(html)) {
    if (token.type === 'comment')
      continue;
    if (token.type === 'text') {
      if (skipDepth)
        continue;
      const text = decodeEntities(html.slice(token.start, token.end)).replace(/\s+/g, ' ').trim();
      if (text)
        out.push(`#${text}`);
      continue;
    }
    if (token.type === 'start') {
      const attrs = token.attrs.map(attr => `${attr.name}=${JSON.stringify(attr.value.replace(/\s+/g, ' ').trim())}`).sort().join(' ');
      if (ignore(token.name, attrs)) {
        if (token.name === 'script' || token.name === 'style')
          skipDepth++;
        continue;
      }
      if (!IMPLIED.has(token.name))
        out.push(`<${token.name} ${attrs}>`);
      continue;
    }
    if (token.type !== 'end')
      continue;
    if (skipDepth && (token.name === 'script' || token.name === 'style')) {
      skipDepth--;
      continue;
    }
    if (!IMPLIED.has(token.name))
      out.push(`</${token.name}>`);
  }
  return out;
}

export function listFiles(root: string, dir: string = root): Array<string> {
  const files: Array<string> = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory())
      files.push(...listFiles(root, path));
    else
      files.push(relative(root, path));
  }
  return files.sort();
}

export interface SiteDifference {
  file: string;
  kind: 'missing' | 'extra' | 'html' | 'bytes';
  detail?: string;
  /** For HTML: the changed token runs. */
  hunks?: Array<Hunk>;
}

/** A run of tokens removed from the expected page and added in the actual one. */
export interface Hunk {
  removed: Array<string>;
  added: Array<string>;
}

/** Token-level diff (longest common subsequence). */
export function diffTokens(a: Array<string>, b: Array<string>): Array<Hunk> {
  const n = a.length;
  const m = b.length;
  const lcs: Array<Uint32Array> = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const hunks: Array<Hunk> = [];
  let current: Hunk | undefined;
  let i = 0;
  let j = 0;
  const flush = () => {
    if (current && (current.removed.length || current.added.length))
      hunks.push(current);
    current = undefined;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      current = current || { removed: [], added: [] };
      current.added.push(b[j++]);
    } else {
      current = current || { removed: [], added: [] };
      current.removed.push(a[i++]);
    }
  }
  flush();
  return hunks;
}

export function compareSites(expectedDir: string, actualDir: string, options: { skip?: (file: string) => boolean; ignoreElement?: (tag: string, attrs: string) => boolean } = {}): Array<SiteDifference> {
  const skip = options.skip || (() => false);
  const expected = listFiles(expectedDir).filter(file => !skip(file));
  const actual = new Set(listFiles(actualDir).filter(file => !skip(file)));
  const differences: Array<SiteDifference> = [];
  for (const file of expected) {
    if (!actual.has(file)) {
      differences.push({ file, kind: 'missing' });
      continue;
    }
    actual.delete(file);
    const a = readFileSync(join(expectedDir, file));
    const b = readFileSync(join(actualDir, file));
    if (/\.html?$/.test(file)) {
      const hunks = diffTokens(normalizeHtml(a.toString('utf8'), options.ignoreElement), normalizeHtml(b.toString('utf8'), options.ignoreElement));
      if (hunks.length)
        differences.push({ file, kind: 'html', hunks, detail: hunks.map(hunk => `- ${hunk.removed.join(' ')}\n    + ${hunk.added.join(' ')}`).join('\n    ') });
    } else if (!a.equals(b))
      differences.push({ file, kind: 'bytes', detail: `${a.length} vs ${b.length} bytes` });
  }
  for (const file of actual)
    differences.push({ file, kind: 'extra' });
  return differences;
}

if (import.meta.main) {
  const [expectedDir, actualDir] = process.argv.slice(2);
  const differences = compareSites(expectedDir, actualDir);
  for (const difference of differences)
    console.log(`${difference.kind.padEnd(8)} ${difference.file}${difference.detail ? `\n  ${difference.detail}` : ''}`);
  console.log(`${differences.length} difference(s)`);
}
