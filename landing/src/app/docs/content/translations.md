---
title: Translations
description: Build every page in several languages from one markup, with translation keys.
section: Content
sectionOrder: 4
order: 2
slug: translations
---

<!-- feature: i18n.languages, i18n.translation, config.i18n -->

<p class="lead">Write the markup once, in your base language, and mark the text to translate. YASSB builds every page once per language.</p>

## Languages

Each JSON file in `src/i18n` is a language:

```text
src/i18n/en.json   →  dist/public/en/…
src/i18n/it.json   →  dist/public/it/…
```

Languages are processed in alphabetical order. The first one is served at `/` by the dev server. Without the folder the site has one language and pages go straight to `dist/public`.

## Translation files

```json
{
  "HOME.TITLE": "Benvenuti",
  "HOME.LOGO": "Il logo",
  "COMMON": { "READ_MORE": "Continua a leggere" }
}
```

Keys are flat (`"HOME.TITLE"`) or nested objects (`COMMON.READ_MORE`).

## Marking text

```html
<h1 data-t="HOME.TITLE">Welcome</h1>
<p data-t>Read more</p>
<img src="logo.svg" data-attr-t alt-t="HOME.LOGO" alt="The logo">
<p data-t="GREETING" data-t-interpolate>Hi there</p>
```

| Markup | Effect |
|---|---|
| `data-t="KEY"` | the content of the element becomes the translation of `KEY` |
| `data-t` (empty) | the text of the element is the key |
| `data-attr-t` + `alt-t="KEY"` | sets `alt`; works for any `<attribute>-t` |
| `data-t-interpolate` | `{{KEY}}` placeholders in the translation are replaced |

Translation attributes are removed from the output. A missing key keeps the original text; `yassb build` prints how many keys are missing and `yassb check` lists them.

## Translations run last

Translation runs after every directive, so renderers can emit translatable markup:

```ts
return `<a href="${url}"><span data-t="COMMON.READ_MORE">Read more</span></a>`;
```

Only translated elements are rewritten; the rest of the page is kept exactly as it was.

## HTML in translations

Translations are inserted as text. To allow markup such as `<em>` or links:

```ts
export default {
  i18n: { allowHtml: true }
};
```

## Checks

`yassb check` reports keys missing in some language (`I18N_INCONSISTENT_KEYS`), keys used in pages but missing (`I18N_MISSING_KEY`), keys never used (`I18N_UNUSED_KEY`), and translation attributes left in the output (`I18N_UNTRANSLATED_ATTRIBUTE`), which happens for pages outside a language folder.
