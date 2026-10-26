---
title: Directive syntax
description: How directives are written, how options work, and the LANG and USERNAME placeholders.
section: Directives
sectionOrder: 3
order: 1
slug: syntax
---

<!-- feature: directive.attributes, config.username -->

<p class="lead">Directives are HTML comments with attributes. They are replaced when the site is built, so the source stays valid HTML that any editor understands.</p>

## The built-in directives

| Directive | Does |
|---|---|
| `<!-- component="file.html" -->` | inserts a component ([Pages and components](/docs/concepts/pages-and-components.html)) |
| `<!-- create-from-data-source="file.json" renderer="name" -->` | renders a JSON file ([Data and renderers](/docs/concepts/data-and-renderers.html)) |
| `<!-- public-file-list="folder" renderer="name" -->` | renders the list of files of an output folder ([public-file-list](/docs/directives/public-file-list.html)) |
| `{{ url-to="fragment" }}` | the URL of a page of the site ([url-to](/docs/directives/url-to.html)) |
| `<!-- include-styles-src -->`, `<!-- include-script-src -->` | the stylesheet and script tags ([Asset tags](/docs/directives/asset-tags.html)) |
| `<!-- generate-from-files="folder" -->` | one page per Markdown file ([Markdown and blogs](/docs/content/markdown-and-blogs.html)) |

Your own directives are [custom directives](/docs/directives/custom-directives.html).

## Attributes

Values are written in double quotes and end at the closing quote:

```html
<!-- create-from-data-source="people/team.json" renderer="peopleCards" -->
```

Write a directive on a single line.

## options

`options` holds JSON, written as is inside the quotes (no escaping needed), anywhere in the directive. Objects and arrays both work:

```html
<!-- create-from-data-source="talks.json" renderer="talkList" options="{"limit":3,"order":["keynote","talk"]}" -->
```

Single quotes work too: `options='{"limit":3}'`. Invalid JSON is reported as `OPTIONS_INVALID_JSON` with the file and line, and the options are ignored.

## LANG and USERNAME

Before its attributes are read, every directive has:

- `LANG` replaced by the language being built (`en`, `it`…), options included;
- `USERNAME` replaced by the `username` option of the configuration.

```html
<!-- create-from-data-source="LANG/news.json" renderer="newsList" -->
```

`USERNAME` keeps personal paths out of the sources:

```ts
export default { username: 'alex' };
```

```html
<!-- generate-from-files="/Users/USERNAME/notes/blog" -->
```

> **Warning** Without `username`, `USERNAME` becomes the text `undefined`.
