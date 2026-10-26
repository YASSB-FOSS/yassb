import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describeError, report } from '../diagnostics/diagnostics';
import { HtmlElement, escapeAttribute, escapeText, parseElements, textContent } from '../html/html-scanner';

/**
 * Translates a page into one language. Same markup and rules as 1.x (based on `static-i18n`):
 *
 * - `<span data-t="KEY">English</span>`: the content becomes the translation of `KEY` (as text).
 *   `<span data-t>English</span>`: the key is the text itself.
 * - `<img data-attr-t alt-t="KEY">`: sets `alt` to the translation of `KEY`; works for any `<attr>-t`.
 * - `data-t-interpolate` / `data-attr-t-interpolate`: `{{KEY}}` placeholders are replaced in the text/value.
 * - the translation attributes are removed from the output; a missing key leaves the English text as it is.
 *
 * Unlike 1.x, only the translated elements are rewritten: the rest of the page is kept byte for byte.
 */

type Translations = { [key: string]: unknown };

export interface TranslatorOptions {
  /** Insert translations as HTML instead of text. */
  allowHtml?: boolean;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

export class Translator {

  /** Keys found in pages, translated or not. */
  public readonly usedKeys = new Set<string>();

  /** Keys found in pages but missing in this language, with the pages using them. */
  public readonly missingKeys = new Map<string, Set<string>>();

  private translations: Translations = {};

  constructor(
    private localesPath: string,
    public readonly lang: string,
    private options: TranslatorOptions = {}
  ) {
    this.loadResources();
  }

  /** Translations of a language file, or `{}` if it cannot be read (the problem is reported). */
  public static readTranslations(file: string): Translations {
    if (!existsSync(file))
      return {};
    try {
      let text = readFileSync(file, 'utf8');
      if (text.charCodeAt(0) === 0xFEFF)
        text = text.slice(1);
      return JSON.parse(text);
    } catch (error) {
      report({ level: 'error', code: 'I18N_INVALID_FILE', fatal: true, file, message: `Invalid translation file: ${describeError(error).message}` });
      return {};
    }
  }

  /**
   * Translates the HTML of a page.
   *
   * @param html the page.
   * @param fileForReports the page path, used in reports of missing keys.
   */
  public processHtml(html: string, fileForReports?: string): string {
    if (!html.includes('data-t') && !html.includes('data-attr-t'))
      return html;

    const elements = parseElements(html);
    const edits: Array<Edit> = [];
    let replacedUntil = -1;

    for (const element of elements) {
      if (element.tag.start < replacedUntil)
        continue;
      const names = element.tag.attrs.map(attr => attr.name);
      const hasAttrT = names.includes('data-attr-t');
      const hasT = names.includes('data-t');
      if (!hasAttrT && !hasT)
        continue;

      const tagEdit = new TagEditor(html, element);
      if (hasAttrT)
        this.translateAttributes(tagEdit, fileForReports);
      let content: Edit | undefined;
      if (hasT)
        content = this.translateElement(html, element, tagEdit, fileForReports);

      edits.push({ start: element.tag.start, end: element.tag.end, text: tagEdit.render() });
      if (content) {
        edits.push(content);
        replacedUntil = content.end;
      }
    }

    return applyEdits(html, edits);
  }

  /** Translation of a key: flat keys first (`"HOME.INTRO": "…"`), then nested objects (`{ "HOME": { "INTRO": "…" } }`). */
  public lookup(key: string): string | undefined {
    const flat = this.translations[key];
    if (typeof flat === 'string' || typeof flat === 'number')
      return String(flat);
    let node: unknown = this.translations;
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object')
        return undefined;
      node = (node as Translations)[part];
    }
    return typeof node === 'string' || typeof node === 'number' ? String(node) : undefined;
  }

  private loadResources(): void {
    this.translations = Translator.readTranslations(join(this.localesPath, `${this.lang}.json`));
  }

  private interpolate(text: string): string {
    return text.replace(/{{([^{}]*)}}/g, (all, key: string) => {
      this.use(key, undefined);
      const value = this.lookup(key);
      return value === undefined ? all : value;
    });
  }

  private use(key: string, file: string | undefined): string | undefined {
    this.usedKeys.add(key);
    const value = this.lookup(key);
    if (value === undefined) {
      const files = this.missingKeys.get(key) || new Set<string>();
      if (file)
        files.add(file);
      this.missingKeys.set(key, files);
    }
    return value;
  }

  /** `<x data-attr-t title-t="KEY">` → `<x title="translation">`. */
  private translateAttributes(tag: TagEditor, file: string | undefined): void {
    const interpolate = tag.names().some(name => name.endsWith('-t-interpolate'));
    for (const attr of tag.original()) {
      if (!attr.value || attr.name === 'data-attr-t' || attr.name === 'data-t' || !attr.name.endsWith('-t'))
        continue;
      const target = attr.name.slice(0, -2);
      const translation = interpolate ? this.interpolate(attr.value) : this.use(attr.value, file);
      if (translation !== undefined)
        tag.set(target, translation);
      tag.remove(attr.name);
    }
    tag.remove('data-attr-t');
    tag.remove('data-attr-t-interpolate');
  }

  /** `<x data-t="KEY">English</x>` → `<x>translation</x>`. Returns the content edit, if any. */
  private translateElement(html: string, element: HtmlElement, tag: TagEditor, file: string | undefined): Edit | undefined {
    let key = tag.get('data-t') || '';
    tag.remove('data-t');
    const interpolate = tag.has('data-t-interpolate');
    if (interpolate)
      tag.remove('data-t-interpolate');
    const inner = html.slice(element.contentStart, element.contentEnd);
    if (!key)
      key = textContent(inner);
    if (!key || element.empty)
      return undefined;

    let translation = this.use(key, file);
    if (translation === undefined)
      return undefined;

    if (!element.closed) {
      report({
        level: 'warning',
        code: 'I18N_UNCLOSED_ELEMENT',
        file,
        message: `<${element.tag.name} data-t="${key}"> has no closing tag and was not translated.`,
        hint: `Close the element with </${element.tag.name}>.`
      });
      return undefined;
    }

    let content: string;
    if (this.options.allowHtml)
      content = interpolate ? this.interpolate(inner) : translation;
    else {
      if (interpolate)
        translation = this.interpolate(translation);
      content = escapeText(translation);
    }
    return { start: element.contentStart, end: element.contentEnd, text: content };
  }

}

/**
 * Changes the attributes of one start tag while keeping the original text of the attributes it does not touch.
 */
class TagEditor {

  private attrs: Array<{ name: string; value: string; raw?: string; outer?: string }>;

  constructor(private html: string, private element: HtmlElement) {
    this.attrs = element.tag.attrs.map(attr => ({
      name: attr.name,
      value: attr.value,
      raw: html.slice(attr.start, attr.end),
      outer: html.slice(attr.outerStart, attr.start)
    }));
  }

  public original(): Array<{ name: string; value: string }> {
    return this.element.tag.attrs.map(attr => ({ name: attr.name, value: attr.value }));
  }

  public names(): Array<string> {
    return this.attrs.map(attr => attr.name);
  }

  public has(name: string): boolean {
    return this.attrs.some(attr => attr.name === name);
  }

  public get(name: string): string | undefined {
    return this.attrs.find(attr => attr.name === name)?.value;
  }

  public set(name: string, value: string): void {
    const existing = this.attrs.find(attr => attr.name === name);
    if (existing) {
      existing.value = value;
      existing.raw = undefined;
    } else
      this.attrs.push({ name, value, outer: ' ' });
  }

  public remove(name: string): void {
    this.attrs = this.attrs.filter(attr => attr.name !== name);
  }

  public render(): string {
    const tag = this.element.tag;
    let text = this.html.slice(tag.start, tag.start + 1 + tag.name.length);
    for (const attr of this.attrs)
      text += (attr.outer || ' ') + (attr.raw !== undefined ? attr.raw : `${attr.name}="${escapeAttribute(attr.value)}"`);
    return text + this.html.slice(tag.closeStart, tag.end);
  }

}

function applyEdits(html: string, edits: Array<Edit>): string {
  if (!edits.length)
    return html;
  edits.sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;
  for (const edit of edits) {
    if (edit.start < cursor)
      continue;
    result += html.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + html.slice(cursor);
}
