---
title: Markdown and blogs
description: Generate one page per Markdown file, with front matter, for blogs and documentation.
section: Content
sectionOrder: 4
order: 1
slug: markdown-and-blogs
---

<!-- feature: directive.generate-from-files, content.markdown, content.front-matter, config.showdownConverterOptions, config.grayMatterOption -->

<p class="lead">Write posts in Markdown with front matter; a template turns each file into a page. These docs are built exactly this way.</p>

## A post

```md
---
title: Hello world
date: 2026-01-15
slug: hello
description: The first post.
---

Some **Markdown**, with tables, code and links.
```

## A template

Templates live in `src/app/pages-to-generate`. The `generate-from-files` directive names the folder of the Markdown files (relative to `src/app`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>{ title } · My blog</title>
  <meta name="description" content="{ description }">
</head>
<body>
  <!-- component="site/header.html" -->
  <article>
    <h1>{ title }</h1>
    <time>{ date }</time>
    <!-- generate-from-files="blog" -->
  </article>
</body>
</html>
```

For `src/app/pages-to-generate/blog/post.html` and `src/app/blog/2026/hello.md`, the page is written to `dist/public/blog/2026/hello.html`: template folder, then the sub-folder of the file, then the slug.

## Rules

- `.md` and `.txt` files are read recursively.
- The slug is the front matter `slug`, else the `title` in kebab-case, else the file name.
- The directive must be in the template itself, not in a component.
- Generated pages then go through every other directive, like any page.
- Empty files are reported (`MARKDOWN_EMPTY`); a folder that does not exist fails the build (`TEMPLATE_SOURCE_NOT_FOUND`); a template without the directive is skipped (`TEMPLATE_NO_DIRECTIVE`).

## Front matter

Values of the front matter replace `{ name }` placeholders, with one space inside each brace, anywhere in the generated page:

- strings are inserted as they are (not escaped);
- dates, and the `date` key, become ISO strings (`2026-01-15T00:00:00.000Z`);
- other values are inserted as JSON.

Components with front matter and [custom directives](/docs/directives/custom-directives.html) returning `data` add placeholders too. An invalid `date` is reported (`FRONT_MATTER_INVALID_DATE`) and inserted as it is.

## Markdown options

Markdown is converted with [Showdown](https://showdownjs.com). The default options are `{ tables: true }`; replace them with `showdownConverterOptions`:

```ts
export default {
  showdownConverterOptions: {
    tables: true,
    strikethrough: true,
    ghCompatibleHeaderId: true
  }
};
```

Front matter is read with [gray-matter](https://github.com/jonschlinkert/gray-matter). With an excerpt separator, `{ excerpt }` becomes available:

```ts
export default {
  grayMatterOption: { excerpt: true, excerpt_separator: '<!-- more -->' }
};
```

## Multi-language blogs

Only pages inside a language folder are translated. With translations, put one template per language: `pages-to-generate/en/blog/post.html` and `pages-to-generate/it/blog/post.html`, each pointing to its own folder of posts.

> **Tip** A Markdown file can also be included in a page as a component: `<!-- component="intro.md" -->`.
