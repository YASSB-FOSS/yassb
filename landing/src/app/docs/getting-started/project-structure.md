---
title: Project structure
description: The folders of a YASSB project and how to rename them.
section: Getting started
sectionOrder: 1
order: 3
slug: project-structure
---

<!-- feature: config.workingDir, assets.copy -->

<p class="lead">YASSB works with conventional folders. Every name can be changed with the <code>workingDir</code> option.</p>

```text
config/default.ts            configuration
src/
  i18n/<lang>.json           translations (optional); their names define the languages
  assets/                    copied as is to <out>/assets
  app/
    pages/                   one HTML file per page; other files (robots.txt…) are copied too
    components/              HTML, SVG and Markdown fragments
    data-sources/            JSON files rendered by renderers
    pages-to-generate/       templates: one page per Markdown file
    styles/styles.scss       stylesheet entry
    scripts/main.ts          browser script entry
dist/public/                 output
```

## Pages and output paths

Each file in `src/app/pages` becomes a page: `pages/about.html` → `dist/public/about.html`. With translations, each page is built once per language: `dist/public/en/about.html`, `dist/public/it/about.html`.

## Assets

`src/assets/` is copied to `dist/public/assets/` at the start of every build, keeping its structure. Files whose size and modification time did not change are skipped, so rebuilds are quick. Files you delete from `src/assets` stay in the output until you clean it: set `cleanOut: true` or run `yassb build --clean`.

## Renaming folders

```ts
export default {
  workingDir: {
    out: 'public',
    styles: 'styles/main.css'
  }
};
```

| Option | Default | Relative to |
|---|---|---|
| `base` | the current folder | the folder YASSB runs in |
| `src` | `src` | `base` |
| `out` | `dist/public` | `base` |
| `assets`, `i18n`, `app` | `assets`, `i18n`, `app` | `src` |
| `pages`, `components`, `dataSources`, `pagesToGenerate` | `pages`, `components`, `data-sources`, `pages-to-generate` | `app` |
| `posts` | `app` itself | `app` (base of `generate-from-files`) |
| `scripts`, `styles` | `scripts/main.ts`, `styles/styles.scss` | `app` |
| `scriptsOutFolder`, `stylesOutFolder` | `assets/js`, `assets/css` | `out` |

Missing folders are created on the first build, and so are empty script and style entries.
