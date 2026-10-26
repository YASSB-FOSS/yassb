import { describe, expect, test } from 'bun:test';
import { DirectivePropsGetter } from '../src/directives/tools/directive-props-getter.class';

const props = (directive: string, lang?: string) => new DirectivePropsGetter(directive, { username: 'me' }, lang).parse();

describe('directive attributes', () => {
  test('reads main value, renderer and JSON options', () => {
    expect(props('<!-- create-from-data-source="a.json" renderer="list" options="{"limit":3}" -->'))
      .toEqual({ 'create-from-data-source': 'a.json', renderer: 'list', options: { limit: 3 } });
  });

  test('reads options with arrays and nested quotes, in any position', () => {
    expect(props('<!-- create-from-data-source="a.json" options="{"order":["b","a"],"label":"x \\"y\\" }"}" renderer="r" -->'))
      .toEqual({ 'create-from-data-source': 'a.json', options: { order: ['b', 'a'], label: 'x "y" }' }, renderer: 'r' });
  });

  test('replaces LANG and USERNAME', () => {
    expect(props('<!-- component="LANG/USERNAME.html" -->', 'it')).toEqual({ component: 'it/me.html' });
  });

  test('keeps characters 1.x truncated', () => {
    expect(props('<!-- create-from-data-source="niño+data.json" -->')).toEqual({ 'create-from-data-source': 'niño+data.json' });
  });

  test('reports invalid options', () => {
    const getter = new DirectivePropsGetter('<!-- create-from-data-source="a.json" options="{limit:3}" -->', {});
    getter.parse();
    expect(getter.errors.map(error => error.code)).toEqual(['OPTIONS_INVALID_JSON']);
  });
});
