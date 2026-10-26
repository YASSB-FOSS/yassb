---
title: Pages and components
description: Compose pages from reusable HTML, SVG and Markdown fragments.
section: Core concepts
sectionOrder: 2
order: 1
slug: pages-and-components
---

<!-- feature: directive.component -->

<p class="lead">A page is a plain HTML file. Shared parts live in components and are inserted with the <code>component</code> directive.</p>

## Including a component

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- component="site/head.html" -->
</head>
<body>
  <!-- component="site/header.html" -->
  <main>…</main>
  <!-- component="site/footer.html" -->
</body>
</html>
```

The path is relative to `src/app/components`. Components can include other components, as deep as you need.

## What can be a component

| Extension | Inserted as |
|---|---|
| `.html`, `.htm` | HTML, with its directives processed |
| `.svg` | SVG markup (icons, logos) |
| `.md`, `.txt` | Markdown converted to HTML |

A component can start with front matter; its values become placeholders of the page that includes it:

```html
---
title: Contact us
---
<title>{ title }</title>
```

## How components are processed

Each component is processed on its own, before it is inserted: its directives run with the component file as the current file, then the result replaces the comment. The page is processed last. This matters for [custom directives](/docs/directives/custom-directives.html) that need to see the whole page.

## Per-language components

`LANG` in the path is replaced by the language being built:

```html
<!-- component="LANG/legal-notice.html" -->
```

Prefer one component with [translation keys](/docs/content/translations.html); use `LANG` only for content that is truly different per language.

## When something is wrong

A missing file is reported as `COMPONENT_NOT_FOUND` with the file and line of the directive, and nothing is inserted. A file type that cannot be included is `COMPONENT_UNSUPPORTED_FORMAT`. Components that include each other endlessly stop after 40 levels with `COMPONENT_CYCLE`.

> **Note** Write one directive per line: the directive is matched on a single line.
