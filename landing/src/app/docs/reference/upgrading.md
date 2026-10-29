---
title: Upgrading from 1.x
description: What changes for sites written for YASSB 1, and what to check.
section: Reference
sectionOrder: 7
order: 3
slug: upgrading
---

<p class="lead">Sites written for YASSB 1 build with YASSB 2 without changes, and produce the same pages. What changes is around them.</p>

## Steps

```bash
npm install --save-dev yassb-web@2
npx yassb check
```

`yassb check` lists what needs attention, starting with undeclared dependencies.

## What changed

- **Node.js 20+ or Bun** is required.
- **Fewer dependencies.** YASSB no longer installs packages it does not need: react, react-dom, fs-extra, cheerio, lodash, moment, webpack, ts-node, typescript and others. If your code imports one of them without declaring it in `package.json`, the build stops with `CONFIG_MODULE_NOT_FOUND` and tells you what to install; `yassb check` reports them in advance as `UNDECLARED_DEPENDENCY`.
- **esbuild instead of webpack** for scripts: same file name, no separate `.LICENSE.txt` file. A `webpackConfig` still works if webpack is installed in your site.
- **TypeScript without ts-node**: configuration and site code are compiled with esbuild, faster, with the same `__dirname` behaviour.
- **Watch mode** rebuilds code changes in a new process and content changes in a warm one (then verified), watches the whole project and shows errors in the browser.

## Fixed

- `options` containing arrays (`{"order":["a","b"]}`) were silently ignored and the block disappeared.
- `$$` and `$&` in content were altered when inserted into pages.
- `basicElement` wrote `<undefined>` elements without a `tag` option; it now writes `span`, as documented.
- An element with both `data-attr-t` and `data-t` lost its text translation.
- Watch mode reloaded the browser before the rebuild was finished.

## New

`yassb inspect`, `yassb check`, `yassb docs`, `--strict`, `--clean`, `--json`, `sourcePath` in renderer props, nested translation keys, `i18n.allowHtml`, `sitemap: false`, `cleanOut`, `beforeBuild` and `afterBuild` hooks, `esbuildOptions`, `defineConfig`, the error overlay and CSS hot swap in watch mode, and the [feature catalogue](/docs/reference/features.html).
