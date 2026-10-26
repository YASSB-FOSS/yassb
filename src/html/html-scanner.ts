/**
 * Minimal HTML scanner: finds tags, attributes and the extent of elements without re-serializing the document.
 *
 * Used by the translator (to change only the elements with `data-t` / `data-attr-t`), by `yassb check` and
 * `yassb inspect`. It is lenient like browsers: comments, doctype and raw text elements (`script`, `style`,
 * `textarea`, `title`, …) are skipped, optional end tags (`p`, `li`, `td`, …) are closed implicitly.
 */

export interface HtmlAttribute {
  /** Lowercase name. */
  name: string;
  /** Value with entities decoded; `''` for attributes without value. */
  value: string;
  /** True if written without `=value`. */
  bare: boolean;
  /** Start of the whitespace before the attribute (for removal). */
  outerStart: number;
  /** Start of the name. */
  start: number;
  /** End of the attribute (after the closing quote). */
  end: number;
}

export interface StartTagToken {
  type: 'start';
  /** Lowercase tag name. */
  name: string;
  attrs: Array<HtmlAttribute>;
  start: number;
  end: number;
  /** Position of `>` or `/>` that closes the tag. */
  closeStart: number;
  selfClosing: boolean;
}

export interface EndTagToken {
  type: 'end';
  name: string;
  start: number;
  end: number;
}

export interface OtherToken {
  type: 'text' | 'comment';
  start: number;
  end: number;
}

export type HtmlToken = StartTagToken | EndTagToken | OtherToken;

/** Elements whose content is text, not markup. */
export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);

export const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const WHITESPACE = /\s/;

function isAsciiLetter(char: string | undefined): boolean {
  return !!char && /[a-zA-Z]/.test(char);
}

/**
 * Splits HTML into tokens, in document order.
 */
export function tokenize(html: string): Array<HtmlToken> {
  const tokens: Array<HtmlToken> = [];
  const length = html.length;
  let i = 0;

  const pushText = (start: number, end: number) => {
    if (end > start)
      tokens.push({ type: 'text', start, end });
  };

  while (i < length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      pushText(i, length);
      break;
    }
    pushText(i, lt);

    if (html.startsWith('<!--', lt)) {
      const close = html.indexOf('-->', lt + 4);
      const end = close < 0 ? length : close + 3;
      tokens.push({ type: 'comment', start: lt, end });
      i = end;
      continue;
    }

    const next = html[lt + 1];

    if (next === '!' || next === '?') {
      const isCdata = html.startsWith('<![CDATA[', lt);
      const close = isCdata ? html.indexOf(']]>', lt) : html.indexOf('>', lt);
      const end = close < 0 ? length : close + (isCdata ? 3 : 1);
      tokens.push({ type: 'comment', start: lt, end });
      i = end;
      continue;
    }

    if (next === '/' && isAsciiLetter(html[lt + 2])) {
      let p = lt + 2;
      while (p < length && !WHITESPACE.test(html[p]) && html[p] !== '/' && html[p] !== '>')
        p++;
      const name = html.slice(lt + 2, p).toLowerCase();
      const close = html.indexOf('>', p);
      const end = close < 0 ? length : close + 1;
      tokens.push({ type: 'end', name, start: lt, end });
      i = end;
      continue;
    }

    if (!isAsciiLetter(next)) {
      pushText(lt, lt + 1);
      i = lt + 1;
      continue;
    }

    const tag = readStartTag(html, lt);
    tokens.push(tag);
    i = tag.end;

    if (RAW_TEXT_ELEMENTS.has(tag.name) && !tag.selfClosing) {
      const closeAt = findRawTextEnd(html, i, tag.name);
      pushText(i, closeAt);
      i = closeAt;
    }
  }

  return tokens;
}

function readStartTag(html: string, lt: number): StartTagToken {
  const length = html.length;
  let p = lt + 1;
  while (p < length && !WHITESPACE.test(html[p]) && html[p] !== '/' && html[p] !== '>')
    p++;
  const name = html.slice(lt + 1, p).toLowerCase();
  const attrs: Array<HtmlAttribute> = [];
  let selfClosing = false;

  while (p < length) {
    const outerStart = p;
    while (p < length && (WHITESPACE.test(html[p]) || html[p] === '/')) {
      selfClosing = html[p] === '/';
      p++;
    }
    if (p >= length)
      break;
    if (html[p] === '>') {
      const closeStart = selfClosing && html[p - 1] === '/' ? p - 1 : p;
      return { type: 'start', name, attrs, start: lt, end: p + 1, closeStart, selfClosing: selfClosing && html[p - 1] === '/' };
    }
    selfClosing = false;

    const start = p;
    p++;
    while (p < length && !WHITESPACE.test(html[p]) && html[p] !== '/' && html[p] !== '>' && html[p] !== '=')
      p++;
    const rawName = html.slice(start, p);
    let q = p;
    while (q < length && WHITESPACE.test(html[q]))
      q++;

    if (html[q] !== '=') {
      attrs.push({ name: rawName.toLowerCase(), value: '', bare: true, outerStart, start, end: p });
      continue;
    }

    q++;
    while (q < length && WHITESPACE.test(html[q]))
      q++;
    const quote = html[q];
    let value: string;
    if (quote === '"' || quote === '\'') {
      const close = html.indexOf(quote, q + 1);
      const valueEnd = close < 0 ? length : close;
      value = html.slice(q + 1, valueEnd);
      p = close < 0 ? length : close + 1;
    } else {
      let v = q;
      while (v < length && !WHITESPACE.test(html[v]) && html[v] !== '>')
        v++;
      value = html.slice(q, v);
      p = v;
    }
    attrs.push({ name: rawName.toLowerCase(), value: decodeEntities(value), bare: false, outerStart, start, end: p });
  }

  return { type: 'start', name, attrs, start: lt, end: length, closeStart: length, selfClosing: false };
}

function findRawTextEnd(html: string, from: number, name: string): number {
  const lower = html.toLowerCase();
  let at = from;
  while (true) {
    const found = lower.indexOf(`</${name}`, at);
    if (found < 0)
      return html.length;
    const after = html[found + name.length + 2];
    if (after === undefined || after === '>' || after === '/' || WHITESPACE.test(after))
      return found;
    at = found + 1;
  }
}

/** An element found in the document, with the extent of its content. */
export interface HtmlElement {
  tag: StartTagToken;
  /** Start of the content (end of the start tag). */
  contentStart: number;
  /** End of the content (start of the end tag, or where the element was implicitly closed). */
  contentEnd: number;
  /** End of the end tag, or `contentEnd` if there is none. */
  end: number;
  /** True when a matching end tag was found. */
  closed: boolean;
  /** True for void elements and self-closing foreign elements. */
  empty: boolean;
}

const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

/** Which open element a new start tag closes implicitly. */
function impliedClose(open: string, incoming: string): boolean {
  switch (open) {
    case 'p': return CLOSES_P.has(incoming);
    case 'li': return incoming === 'li';
    case 'dt':
    case 'dd': return incoming === 'dt' || incoming === 'dd';
    case 'option': return incoming === 'option' || incoming === 'optgroup';
    case 'optgroup': return incoming === 'optgroup';
    case 'tr': return incoming === 'tr' || incoming === 'tbody' || incoming === 'tfoot' || incoming === 'thead';
    case 'td':
    case 'th': return incoming === 'td' || incoming === 'th' || incoming === 'tr' || incoming === 'tbody' || incoming === 'tfoot';
    case 'thead':
    case 'tbody': return incoming === 'tbody' || incoming === 'tfoot';
    case 'rt':
    case 'rp': return incoming === 'rt' || incoming === 'rp';
    default: return false;
  }
}

/**
 * Finds every element of the document with the extent of its content, in document order.
 */
export function parseElements(html: string, tokens: Array<HtmlToken> = tokenize(html)): Array<HtmlElement> {
  const elements: Array<HtmlElement> = [];
  const stack: Array<HtmlElement> = [];
  let foreignDepth = 0;

  const close = (element: HtmlElement, contentEnd: number, end: number, closed: boolean) => {
    element.contentEnd = contentEnd;
    element.end = end;
    element.closed = closed;
    if (element.tag.name === 'svg' || element.tag.name === 'math')
      foreignDepth--;
  };

  for (const token of tokens) {
    if (token.type === 'start') {
      while (stack.length && impliedClose(stack[stack.length - 1].tag.name, token.name)) {
        const open = stack.pop()!;
        close(open, token.start, token.start, true);
      }
      const isVoid = VOID_ELEMENTS.has(token.name) || (token.selfClosing && foreignDepth > 0);
      const element: HtmlElement = { tag: token, contentStart: token.end, contentEnd: token.end, end: token.end, closed: isVoid, empty: isVoid };
      elements.push(element);
      if (!isVoid) {
        if (token.name === 'svg' || token.name === 'math')
          foreignDepth++;
        stack.push(element);
      }
    } else if (token.type === 'end') {
      let index = stack.length - 1;
      while (index >= 0 && stack[index].tag.name !== token.name)
        index--;
      if (index < 0)
        continue;
      while (stack.length > index + 1) {
        const open = stack.pop()!;
        close(open, token.start, token.start, OPTIONAL_END_TAG.has(open.tag.name));
      }
      const element = stack.pop()!;
      close(element, token.start, token.end, true);
    }
  }

  while (stack.length) {
    const open = stack.pop()!;
    close(open, html.length, html.length, OPTIONAL_END_TAG.has(open.tag.name));
  }

  return elements;
}

/** Elements whose end tag may be omitted: when implicitly closed they still count as closed. */
const OPTIONAL_END_TAG = new Set(['html', 'head', 'body', 'p', 'li', 'dt', 'dd', 'option', 'optgroup', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'rt', 'rp', 'colgroup', 'caption']);

const NAMED_ENTITIES: { [name: string]: string } = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·',
  euro: '€', deg: '°', times: '×', egrave: 'è', eacute: 'é', agrave: 'à', aacute: 'á', igrave: 'ì', iacute: 'í',
  ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú', Egrave: 'È', Eacute: 'É', Agrave: 'À', Ograve: 'Ò', Ugrave: 'Ù',
  ccedil: 'ç', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', sect: '§', para: '¶', shy: '­'
};

/** Decodes the most common named entities and all numeric ones. Unknown entities are left as they are. */
export function decodeEntities(text: string): string {
  if (!text.includes('&'))
    return text;
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (all, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : all;
    }
    return NAMED_ENTITIES[entity] ?? all;
  });
}

/** Escapes text for HTML content. */
export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapes text for a double-quoted attribute value. */
export function escapeAttribute(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Text content of an HTML fragment: tags and comments removed, entities decoded. */
export function textContent(html: string): string {
  let text = '';
  for (const token of tokenize(html))
    if (token.type === 'text')
      text += html.slice(token.start, token.end);
  return decodeEntities(text);
}
