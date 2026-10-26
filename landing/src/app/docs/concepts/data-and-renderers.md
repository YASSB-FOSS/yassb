---
title: Data and renderers
description: Keep content in JSON and turn it into HTML with TypeScript renderers.
section: Core concepts
sectionOrder: 2
order: 2
slug: data-and-renderers
---

<!-- feature: directive.create-from-data-source, api.custom-renderers, config.customRenderers, renderer.basicElement, renderer.liDateDescription -->

<p class="lead">Lists, cards, timelines: anything repeated comes from a JSON file and a renderer. The page says which file it shows, the renderer says how.</p>

## A data source

```json
[
  { "title": "Static sites in 2026", "date": "2026-03-12", "place": "Milan" },
  { "title": "Agents and the web", "date": "2026-05-02", "place": "Online" }
]
```

Data sources live in `src/app/data-sources` (sub-folders are fine). Keep them as data: records, texts, dates. Which items go on which page, and how many, belongs in the HTML.

## A renderer

```ts
import { RendererProps } from 'yassb-web';

interface Talk {
  title: string;
  date: string;
  place: string;
}

export function talkList({ source, options }: RendererProps<Array<Talk>, { limit?: number }>): string {
  return source
    .slice(0, options?.limit ?? source.length)
    .map(talk => `<li><time>${talk.date}</time> ${talk.title} <span>${talk.place}</span></li>`)
    .join('');
}
```

Register it in the configuration:

```ts
import { talkList } from '../builder/renderers';

export default {
  customRenderers: { talkList }
};
```

## Placing it on a page

```html
<ul class="talks">
  <!-- create-from-data-source="talks.json" renderer="talkList" options="{"limit":3}" -->
</ul>
```

`options` is JSON written as is inside the quotes and is passed to the renderer. Repeat the directive to show several files; each directive renders one file.

## Renderer props

| Prop | Content |
|---|---|
| `source` | the parsed JSON |
| `sourcePath` | absolute path of the JSON file |
| `options` | the parsed `options` attribute |
| `lang` | the language being built (`undefined` without translations) |
| `currentFilePath` | the file being processed |
| `config` | the configuration, with absolute folders |
| `frontMatterStore` | front matter of every page, by output path |

Renderers return a string and never write files. Escape the data you insert into HTML. Emit fixed UI text as `<span data-t="KEY">English</span>` so it gets [translated](/docs/content/translations.html). The JSON file is parsed again for every directive, so a renderer can sort or change its data freely.

## Built-in renderers

### basicElement

One element per item, with `item.description` as content (`item.description[lang]` with translations). Used when a directive has no renderer.

```html
<ul>
  <!-- create-from-data-source="items.json" renderer="basicElement" options="{"tag":"li","attributes":{"class":"item"}}" -->
</ul>
```

Options: `tag` (default `span`) and `attributes` (`true` writes a bare attribute, `false` omits it, arrays are joined with spaces).

### liDateDescription

`<li><u>date</u>: description</li>` per item, with dates formatted in the current language:

```json
[
  { "date": { "start": "2019/03", "end": "-" }, "description": "Working at Acme" },
  { "date": { "start": "2015/09/12", "end": "2018/06/30" }, "description": "Studying" },
  { "date": { "raw": "Someday" }, "description": "Retiring" }
]
```

Dates can be `YYYY`, `YYYY/MM` or `YYYY/MM/DD`; `end: "-"` becomes `<span data-t="PRESENT">`, translated by your language files.

## Errors

| Code | When |
|---|---|
| `DATA_SOURCE_NOT_FOUND` | the JSON file does not exist; nothing is rendered |
| `DATA_SOURCE_INVALID_JSON` | the file is not valid JSON; the build fails |
| `RENDERER_MISSING` | no `renderer` attribute; `basicElement` is used |
| `RENDERER_NOT_FOUND` | the renderer is not registered; `basicElement` is used |
| `RENDERER_FAILED` | the renderer threw; the build fails with the location of the directive |
