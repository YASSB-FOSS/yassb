/**
 * relativeUrls: the URL rewriter on its own, then a real build of the kitchen-sink fixture with the option on.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { parseElements } from '../src/html/html-scanner';
import { relativeUrl, relativizeCss, relativizeHtml } from '../src/post-processing/relative-urls';
import { copyFixture, removeFixture, runCli } from './helpers/fixture';

describe('relativeUrl', () => {
  test('files and folders, from the root and from sub-folders', () => {
    expect(relativeUrl('/assets/css/a.css', '')).toBe('assets/css/a.css');
    expect(relativeUrl('/assets/css/a.css', 'en')).toBe('../assets/css/a.css');
    expect(relativeUrl('/assets/css/a.css', 'en/blog/2024')).toBe('../../../assets/css/a.css');
    expect(relativeUrl('/en/blog/post.html', 'en/blog')).toBe('post.html');
    expect(relativeUrl('/', '')).toBe('./');
    expect(relativeUrl('/', 'en/about')).toBe('../../');
    expect(relativeUrl('/en/', 'en')).toBe('./');
    expect(relativeUrl('/en', 'en')).toBe('../en');
    expect(relativeUrl('/it/about/', 'en/about')).toBe('../../it/about/');
  });

  test('keeps query and fragment, guards against schemes, leaves other URLs alone', () => {
    expect(relativeUrl('/about/?q=1#team', 'en')).toBe('../about/?q=1#team');
    expect(relativeUrl('/?lang=it', 'en')).toBe('../?lang=it');
    expect(relativeUrl('/a:b.html', '')).toBe('./a:b.html');
    for (const url of ['//cdn.example.com/x.js', 'https://example.com/', '#top', 'mailto:a@b.c', 'about.html', '../x', '', '/\\evil'])
      expect(relativeUrl(url, 'en')).toBe(url);
  });
});

describe('relativizeHtml', () => {
  test('rewrites URL attributes, srcset, styles and noscript, not scripts', () => {
    const html = [
      '<link rel="stylesheet" href="/assets/css/s.css">',
      '<a HREF=\'/about/\' class="x">About</a>',
      '<img src="/img/a.png" srcset="/img/a.png 1x, /img/a@2x.png 2x, https://cdn.test/a.png 3x" alt="">',
      '<form action="/search"><button formaction="/go?a=1&amp;b=2">Go</button></form>',
      '<div style="background: url(\'/img/bg.png\')"></div>',
      '<style>.a{background:url(/img/b.png)}@import "/x.css";</style>',
      '<noscript><img src="/img/c.png"></noscript>',
      '<script>fetch("/data.json"); var s = \'<a href="/raw">\';</script>',
      '<a href="https://example.com/">ext</a><a href="#top">top</a><a href="//cdn.test/x">cdn</a><input disabled>'
    ].join('\n');
    const out = relativizeHtml(html, 'en');
    expect(out).toContain('<link rel="stylesheet" href="../assets/css/s.css">');
    expect(out).toContain('<a HREF="../about/" class="x">About</a>');
    expect(out).toContain('src="../img/a.png" srcset="../img/a.png 1x, ../img/a@2x.png 2x, https://cdn.test/a.png 3x"');
    expect(out).toContain('<form action="../search"><button formaction="../go?a=1&amp;b=2">');
    expect(out).toContain('style="background: url(\'../img/bg.png\')"');
    expect(out).toContain('<style>.a{background:url(../img/b.png)}@import "../x.css";</style>');
    expect(out).toContain('<noscript><img src="../img/c.png"></noscript>');
    expect(out).toContain('<script>fetch("/data.json"); var s = \'<a href="/raw">\';</script>');
    expect(out).toContain('<a href="https://example.com/">ext</a><a href="#top">top</a><a href="//cdn.test/x">cdn</a><input disabled>');
  });

  test('leaves a page with <base href> and a page without root-relative URLs unchanged', () => {
    const withBase = '<head><base href="/docs/"></head><a href="/x">x</a>';
    expect(relativizeHtml(withBase, 'en')).toBe(withBase);
    const plain = '<a href="about.html">About</a>';
    expect(relativizeHtml(plain, '')).toBe(plain);
  });
});

describe('relativizeCss', () => {
  test('url() quoted and unquoted, @import, not hosts or data URLs', () => {
    expect(relativizeCss('a{b:url(/f.woff2) url("/g.png") url( \'/h.svg\' )}', 'assets/css'))
      .toBe('a{b:url(../../f.woff2) url("../../g.png") url(\'../../h.svg\')}');
    expect(relativizeCss('@import "/base.css";@import url(/more.css);', 'assets/css')).toBe('@import "../../base.css";@import url(../../more.css);');
    const untouched = 'a{b:url(//cdn.test/x.png) url(data:image/png;base64,AA) url(https://x.test/y) url(img.png)}';
    expect(relativizeCss(untouched, 'assets/css')).toBe(untouched);
  });
});

describe('relativeUrls in a real build', () => {
  const dirs: Array<string> = [];
  afterAll(() => dirs.forEach(removeFixture));

  test('the kitchen-sink output has no root-relative URL left, and check finds no broken link', () => {
    const dir = copyFixture('kitchen-sink');
    dirs.push(dir);
    writeFileSync(join(dir, 'config/local.ts'), 'export default { relativeUrls: true };\n');
    const result = runCli(dir, ['check', '--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.diagnostics.filter((item: { code: string }) => item.code === 'LINK_BROKEN')).toEqual([]);

    const out = join(dir, 'dist/public');
    const pages = listFiles(out).filter(file => file.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(3);
    const leftovers: Array<string> = [];
    for (const page of pages)
      for (const element of parseElements(readFileSync(page, 'utf8')))
        for (const attr of element.tag.attrs)
          if (['href', 'src'].includes(attr.name) && /^\/(?!\/)/.test(attr.value))
            leftovers.push(`${relative(out, page)}: ${attr.name}="${attr.value}"`);
    expect(leftovers).toEqual([]);
    const about = readFileSync(join(out, 'en/about/index.html'), 'utf8');
    expect(about).toContain('<a href="../../">Home</a>');
  });
});

function listFiles(dir: string): Array<string> {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
