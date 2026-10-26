import { VOID_ELEMENTS } from '../../html/html-scanner';

/**
 * Builds an HTML element, like the `create-html-element` package used by 1.x:
 * the default tag is `div`; `html` is inserted as is; attribute values are escaped; `true` writes a bare
 * attribute, `false` skips it, arrays are joined with spaces.
 *
 * @featurePart renderer.basicElement
 */
export function htmlElement({ name = 'div', attributes = {}, html = '' }: { name?: string; attributes?: { [name: string]: unknown }; html?: string }): string {
  let attrs = '';
  for (const key of Object.keys(attributes)) {
    const value = attributes[key];
    if (value === false)
      continue;
    if (value === true) {
      attrs += ` ${escapeGoat(key)}`;
      continue;
    }
    const text = Array.isArray(value) ? value.join(' ') : String(value);
    attrs += ` ${escapeGoat(key)}="${escapeGoat(text)}"`;
  }
  return VOID_ELEMENTS.has(name) ? `<${name}${attrs}>` : `<${name}${attrs}>${html}</${name}>`;
}

function escapeGoat(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
