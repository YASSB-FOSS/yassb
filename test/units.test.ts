import { describe, expect, test } from 'bun:test';
import { basicElement } from '../src/renderers/built-in/basic-element.function';
import { htmlElement } from '../src/renderers/built-in/html-element.function';
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
