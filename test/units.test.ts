import { describe, expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { basicElement } from '../src/renderers/built-in/basic-element.function';
import { htmlElement } from '../src/renderers/built-in/html-element.function';
import { startStaticServer } from '../src/server/static-server';
import { ProjectWatcher } from '../src/watch/project-watcher';
import { waitFor } from './helpers/fixture';
import { SitemapGenerator } from '../src/sitemap/sitemap-generator.class';
import { DateLocalizer } from '../src/tools/dates-helpers/date-localizer.class';
import { DateParser } from '../src/tools/dates-helpers/date-parser.class';

describe('dates (same formats as moment LL / MMMM YYYY in 1.x)', () => {
  test('formats years, months and days', () => {
    expect(new DateLocalizer('2020').localize()).toBe('2020');
    expect(new DateLocalizer('2020/03', 'en').localize()).toBe('March 2020');
    expect(new DateLocalizer('2020/03', 'it').localize()).toBe('marzo 2020');
    expect(new DateLocalizer('2020/03/05', 'en').localize()).toBe('March 5, 2020');
    expect(new DateLocalizer('2020/03/05', 'it').localize()).toBe('5 marzo 2020');
  });

  test('formats ranges and present', () => {
    expect(new DateParser({ start: '2019/03', end: '-' }, 'en').parse()).toBe('March 2019 - <span data-t="PRESENT"></span>');
    expect(new DateParser({ raw: 'Someday' }).parse()).toBe('Someday');
  });
});

describe('built-in renderers', () => {
  test('htmlElement escapes attributes like create-html-element', () => {
    expect(htmlElement({ name: 'img', attributes: { src: 'a"&<', alt: true, hidden: false, cls: ['a', 'b'] } })).toBe('<img src="a&quot;&amp;&lt;" alt cls="a b">');
    expect(htmlElement({ html: 'x' })).toBe('<div>x</div>');
  });

  test('basicElement defaults to span', () => {
    const props = { source: [{ description: 'A' }], lang: undefined as unknown as string, currentFilePath: '', config: {}, frontMatterStore: {} };
    expect(basicElement(props)).toBe('<span>A</span>');
    expect(basicElement({ ...props, options: { tag: 'li', attributes: { class: 'x' } } })).toBe('<li class="x">A</li>');
  });
});

describe('sitemap', () => {
  test('writes the same XML as xml-sitemap', () => {
    expect(SitemapGenerator.toXml(['http://fake.host/', 'http://fake.host/a&b.html'])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>http://fake.host/</loc>\n  </url>\n  <url>\n    <loc>http://fake.host/a&amp;b.html</loc>\n  </url>\n</urlset>'
    );
  });
});

describe('dev server', () => {
  test('answers 304 for unchanged files and serves changed ones in full', async () => {
    const out = mkdtempSync(join(tmpdir(), 'yassb-server-'));
    writeFileSync(join(out, 'index.html'), '<p>one</p>');
    writeFileSync(join(out, 'image.png'), 'png-bytes');
    const { server, port } = await startStaticServer({ port: 0, site: () => ({ out, langs: [] }) });
    const get = (path: string, headers: Record<string, string> = {}) => fetch(`http://localhost:${port}${path}`, { headers });
    try {
      const first = await get('/image.png');
      const etag = first.headers.get('etag') as string;
      expect(first.status).toBe(200);
      expect(first.headers.get('cache-control')).toBe('no-cache');
      expect(etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
      expect(first.headers.get('last-modified')).toBeNull();

      const unchanged = await get('/image.png', { 'If-None-Match': etag });
      expect(unchanged.status).toBe(304);
      expect(await unchanged.text()).toBe('');
      expect((await get('/image.png', { 'If-None-Match': `"other", W/${etag}` })).status).toBe(304);

      // A Range request is answered as before (206), whatever the tag.
      const partial = await get('/image.png', { 'If-None-Match': etag, Range: 'bytes=0-2' });
      expect(partial.status).toBe(206);
      expect(await partial.text()).toBe('png');

      // The rebuilt page gets a new tag and is downloaded again.
      const page = await get('/');
      const pageTag = page.headers.get('etag') as string;
      writeFileSync(join(out, 'index.html'), '<p>two</p>');
      utimesSync(join(out, 'index.html'), new Date(), new Date(Date.now() + 5000));
      const rebuilt = await get('/', { 'If-None-Match': pageTag });
      expect(rebuilt.status).toBe(200);
      expect(rebuilt.headers.get('etag')).not.toBe(pageTag);
      expect(await rebuilt.text()).toBe('<p>two</p>');
    } finally {
      server.close();
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('project watcher', () => {
  test('ignores events that do not change a file (Bun reports one on the source of a copy)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'yassb-watcher-'));
    const outside = mkdtempSync(join(tmpdir(), 'yassb-watcher-out-'));
    const big = join(root, 'big.jpg');
    // Large enough for Bun's copyFileSync to report a change on the source (macOS).
    writeFileSync(big, Buffer.alloc(300 * 1024, 7));
    const wait = (ms: number) => new Promise(resolvePromise => setTimeout(resolvePromise, ms));
    // Older than the "recent" window, as an asset nobody edited.
    await wait(2300);
    const changes: Array<string> = [];
    const watcher = new ProjectWatcher({ roots: [root], ignore: () => [], onChange: paths => changes.push(...paths), debounceMs: 10 });
    watcher.start();
    try {
      await wait(200);
      copyFileSync(big, join(outside, 'copy.jpg'));
      copyFileSync(big, join(outside, 'copy-2.jpg'));
      await wait(500);
      expect(changes).toEqual([]);

      // A real change is reported, also when the modification time is set back (cp -p, Finder).
      writeFileSync(join(root, 'new.txt'), 'new');
      utimesSync(join(root, 'new.txt'), new Date(2020, 0, 1), new Date(2020, 0, 1));
      await waitFor(() => changes.some(path => path.endsWith('new.txt')), 3000, 'new file');
      writeFileSync(big, Buffer.alloc(300 * 1024, 8));
      await waitFor(() => changes.some(path => path.endsWith('big.jpg')), 3000, 'changed file');
    } finally {
      watcher.close();
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
