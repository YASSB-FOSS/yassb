import { describe, expect, test } from 'bun:test';
import { decodeEntities, parseElements, textContent, tokenize } from '../src/html/html-scanner';

describe('html scanner', () => {
  test('tokenizes tags, attributes and comments', () => {
    const tokens = tokenize('<a href="/x" data-t=\'K\' hidden>Hi</a><!-- c --><img src=y.png/>');
    expect(tokens.map(token => token.type)).toEqual(['start', 'text', 'end', 'comment', 'start']);
    const start = tokens[0] as { attrs: Array<{ name: string; value: string; bare: boolean }> };
    expect(start.attrs.map(attr => [attr.name, attr.value, attr.bare])).toEqual([['href', '/x', false], ['data-t', 'K', false], ['hidden', '', true]]);
  });

  test('treats script and style content as text', () => {
    const tokens = tokenize('<script>if (a<b) { "</div>" }</script><p>x</p>');
    expect(tokens.filter(token => token.type === 'start').map(token => (token as { name: string }).name)).toEqual(['script', 'p']);
  });

  test('finds element extents, closing optional end tags', () => {
    const html = '<ul><li>a<li>b</ul><p>x<div>y</div>';
    const elements = parseElements(html);
    const li = elements.filter(element => element.tag.name === 'li');
    expect(li.map(element => html.slice(element.contentStart, element.contentEnd))).toEqual(['a', 'b']);
    const p = elements.find(element => element.tag.name === 'p')!;
    expect(html.slice(p.contentStart, p.contentEnd)).toBe('x');
  });

  test('decodes entities and extracts text', () => {
    expect(decodeEntities('&amp;&lt;&#39;&#x41;&eacute;&unknown;')).toBe('&<\'Aé&unknown;');
    expect(textContent('<b>A</b> &amp; <i>B</i>')).toBe('A & B');
  });
});
