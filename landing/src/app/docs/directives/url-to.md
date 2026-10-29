---
title: url-to
description: Link to any page or file of the site by a fragment of its name.
section: Directives
sectionOrder: 3
order: 2
slug: url-to
---

<!-- feature: directive.url-to, config.siteHost, config.sitemap -->

<p class="lead"><code>url-to</code> finds a file of the built site by a part of its path and inserts its absolute URL. Links survive moving files around.</p>

```html
<a href="{{ url-to="about" }}">About</a>
<a href="{{ url-to="getting-started#install" }}">Install</a>
```

becomes

```html
<a href="/en/about/index.html">About</a>
<a href="/en/blog/getting-started.html#install">Install</a>
```

## How a file is found

1. The fragment (before `#`) is compared, ignoring case, with the URL of every file in the output; it also matches in kebab-case and snake_case (`gettingStarted` finds `getting-started`).
2. With one match, that URL is used.
3. With several, the file closest to the current page wins (fewest folders between them); ties go to an `index.html`. A warning `URL_TO_AMBIGUOUS` is printed; silence it with `options="{"warning":false}"`.
4. With no match nothing is inserted, and `URL_TO_NOT_FOUND` suggests the closest URL.

The anchor (`#install`) is kept.

## What can be found

Every file the current build has written to the output by the time the page is processed: pages, generated pages, assets. Files left in the output by an earlier build (when it is not emptied) are not visible, so the result is the same as in a build into an empty folder. With translations, languages are built in alphabetical order and each language's pages are copied when its turn comes, so do not rely on links to pages of a later language. Within a language, links resolve to the closest file, which is the page of the same language.

## siteHost and sitemap.xml

The list `url-to` searches is the same one written to `sitemap.xml`. Links are always root-relative (`/en/about/index.html`). Set `siteHost` to publish the sitemap with your host:

```ts
export default {
  siteHost: 'https://example.com/'
};
```

> **Warning** End `siteHost` with a slash. Without it, `url-to` produces links starting with `//`, as in YASSB 1.

`sitemap: false` never writes the file; `url-to` keeps working.
