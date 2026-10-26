import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Translator } from '../src/i18n/translator.class';
import { DIAGNOSTICS } from '../src/diagnostics/diagnostics';

DIAGNOSTICS.silent = true;

function translator(translations: object, options = {}): Translator {
  const dir = mkdtempSync(join(tmpdir(), 'yassb-i18n-'));
  writeFileSync(join(dir, 'it.json'), JSON.stringify(translations));
  return new Translator(dir, 'it', options);
}

describe('Translator', () => {
  const t = translator({ 'HOME.TITLE': 'Benvenuti & ciao', 'LOGO': 'Il "logo"', NAME: 'Mario', GREET: 'Ciao {{NAME}}!', nested: { KEY: 'Annidata' }, Hello: 'Ciao' });

  test('translates text and removes data-t', () => {
    expect(t.processHtml('<h1 class="x" data-t="HOME.TITLE">Welcome</h1>')).toBe('<h1 class="x">Benvenuti &amp; ciao</h1>');
  });

  test('uses the text as key when data-t is empty', () => {
    expect(t.processHtml('<p data-t>Hello</p>')).toBe('<p>Ciao</p>');
  });

  test('keeps the original text for missing keys and records them', () => {
    const local = translator({});
    expect(local.processHtml('<p data-t="MISSING">Keep</p>', 'page.html')).toBe('<p>Keep</p>');
    expect([...local.missingKeys.keys()]).toEqual(['MISSING']);
  });

  test('translates attributes with data-attr-t', () => {
    expect(t.processHtml('<img src="a.png" data-attr-t alt-t="LOGO" alt="Logo">')).toBe('<img src="a.png" alt="Il &quot;logo&quot;">');
  });

  test('adds a missing target attribute at the end', () => {
    expect(t.processHtml('<a data-attr-t title-t="NAME" href="/">x</a>')).toBe('<a href="/" title="Mario">x</a>');
  });

  test('interpolates placeholders', () => {
    expect(t.processHtml('<p data-t="GREET" data-t-interpolate>x</p>')).toBe('<p>Ciao Mario!</p>');
    expect(t.processHtml('<a data-attr-t data-attr-t-interpolate title-t="Hi {{NAME}}">x</a>')).toBe('<a title="Hi Mario">x</a>');
  });

  test('supports nested keys', () => {
    expect(t.processHtml('<p data-t="nested.KEY">x</p>')).toBe('<p>Annidata</p>');
  });

  test('translates text and attributes of the same element (1.x lost the text)', () => {
    expect(t.processHtml('<a data-attr-t title-t="NAME" data-t="Hello">Hi</a>')).toBe('<a title="Mario">Ciao</a>');
  });

  test('leaves the rest of the page untouched', () => {
    const page = '<!DOCTYPE html>\n<html><head><title>T</title><script>if (a < b && "<p data-t>") {}</script></head>\n<body class=\'x\'>&eacute; <br/><p data-t="NAME">x</p><!-- <p data-t="NAME"> --></body></html>';
    expect(t.processHtml(page)).toBe(page.replace('<p data-t="NAME">x</p>', '<p>Mario</p>'));
  });

  test('replaces nested translated elements once', () => {
    expect(t.processHtml('<div data-t="NAME"><span data-t="Hello">Hello</span></div>')).toBe('<div>Mario</div>');
  });

  test('inserts HTML with allowHtml', () => {
    const html = translator({ RICH: 'Un <i>libro</i>' }, { allowHtml: true });
    expect(html.processHtml('<p data-t="RICH">A book</p>')).toBe('<p>Un <i>libro</i></p>');
  });
});
