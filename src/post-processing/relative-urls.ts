import { posix } from 'path';
import { escapeAttribute, tokenize } from '../html/html-scanner';

/** Attributes that hold one URL. */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'data', 'cite', 'background', 'manifest', 'xlink:href']);
/** Attributes that hold a list of "URL descriptor" candidates. */
const SRCSET_ATTRIBUTES = new Set(['srcset', 'imagesrcset']);

/** A root-relative URL: one leading slash, not `//host`. */
const ROOT_RELATIVE = /^\/(?![/\\])/;

/**
 * Rewrites a root-relative URL (`/assets/a.css`, `/en/`, `/?q=1#top`) as relative to `fromDir`, the folder of the
 * file that contains it, relative to the output root (`''` for the root, `'en/blog'`). Other URLs are returned
 * unchanged.
 *
 * @internal
 */
export function relativeUrl(url: string, fromDir: string): string {
  if (!ROOT_RELATIVE.test(url))
    return url;
  const cut = url.search(/[?#]/);
  const path = cut === -1 ? url : url.slice(0, cut);
  const suffix = cut === -1 ? '' : url.slice(cut);
  const from = posix.join('/', fromDir);
  let result: string;
  if (path.endsWith('/')) {
    const rel = posix.relative(from, path);
    result = rel ? `${rel}/` : './';
  } else {
    const rel = posix.relative(from, posix.dirname(path));
    result = (rel ? `${rel}/` : '') + posix.basename(path);
  }
  // "a:b" would be read as a scheme.
  if (/^[^/]*:/.test(result))
    result = `./${result}`;
  return result + suffix;
}

/**
 * Rewrites root-relative URLs in CSS: `url(/…)` (quoted or not) and `@import "/…"`.
 *
 * @internal
 */
export function relativizeCss(css: string, fromDir: string): string {
  return css
    .replace(/url\(\s*(['"]?)(\/(?![/\\])[^'")\s]*)\1\s*\)/g, (_match, quote: string, url: string) => `url(${quote}${relativeUrl(url, fromDir)}${quote})`)
    .replace(/@import\s+(['"])(\/(?![/\\])[^'"]*)\1/g, (_match, quote: string, url: string) => `@import ${quote}${relativeUrl(url, fromDir)}${quote}`);
}

/**
 * Rewrites root-relative URLs in an HTML page: URL attributes (`href`, `src`, `action`…), `srcset`, inline
 * `style` attributes and `<style>` blocks, and the markup inside `<noscript>`. Scripts are left alone. A page with
 * a `<base href>` is returned unchanged, because its relative URLs would resolve against that base.
 *
 * @param fromDir folder of the page, relative to the output root (`''`, `'en'`, `'en/blog'`).
 *
 * @internal
 */
export function relativizeHtml(html: string, fromDir: string): string {
  const tokens = tokenize(html);
  if (tokens.some(token => token.type === 'start' && token.name === 'base' && token.attrs.some(attr => attr.name === 'href')))
    return html;

  const edits: Array<{ start: number; end: number; text: string }> = [];
  let rawParent = '';
  for (const token of tokens) {
    if (token.type === 'text' && rawParent) {
      const text = html.slice(token.start, token.end);
      const rewritten = rawParent === 'style' ? relativizeCss(text, fromDir) : rawParent === 'noscript' ? relativizeHtml(text, fromDir) : text;
      if (rewritten !== text)
        edits.push({ start: token.start, end: token.end, text: rewritten });
    }
    rawParent = token.type === 'start' && !token.selfClosing ? token.name : '';
    if (token.type !== 'start')
      continue;

    for (const attr of token.attrs) {
      if (attr.bare)
        continue;
      let value = attr.value;
      if (URL_ATTRIBUTES.has(attr.name))
        value = relativeUrl(value.trim(), fromDir);
      else if (SRCSET_ATTRIBUTES.has(attr.name))
        value = value.split(',').map(candidate => candidate.replace(/^(\s*)(\S+)/, (_match, space: string, url: string) => space + relativeUrl(url, fromDir))).join(',');
      else if (attr.name === 'style')
        value = relativizeCss(value, fromDir);
      if (value === attr.value || (URL_ATTRIBUTES.has(attr.name) && value === attr.value.trim()))
        continue;
      const name = html.slice(attr.start, attr.start + attr.name.length);
      edits.push({ start: attr.start, end: attr.end, text: `${name}="${escapeAttribute(value)}"` });
    }
  }

  let result = html;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  return result;
}
