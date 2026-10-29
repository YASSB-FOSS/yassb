# YASSB guide

YASSB (Yet Another Static Site Builder, npm package `yassb-web`) turns a folder of HTML pages, HTML components,
JSON data, Markdown and translation files into a static site. This guide is written for people and for coding
agents. Print any section with `yassb docs <topic>` (`yassb docs --list` lists them).

## Overview

A YASSB site splits responsibilities in three:

| What | Where | Written in |
|---|---|---|
| Data: records, texts that are content, dates, flags | `src/app/data-sources/*.json`, Markdown files | JSON / Markdown |
| UI: markup, and what is shown where | `src/app/pages/*.html`, `src/app/components/**/*.html` | HTML + directives |
| Logic: turning data into markup | renderers and custom directives registered in `config/default.ts` | TypeScript / JavaScript |

Pages are plain HTML. **Directives** are HTML comments that YASSB replaces at build time:

```html
<!-- component="header.html" -->
<!-- create-from-data-source="news.json" renderer="newsList" options="{"limit":3}" -->
```

A **renderer** is a function `(props) => string` that receives the parsed JSON and returns HTML.
Multi-language sites keep one markup in the base language and mark translatable text with `data-t="KEY"`.

To understand an existing site quickly:

1. `yassb inspect` — pages, components, data sources, renderers, directives and translations, with file:line;
2. `yassb inspect <name>` — everything about one file, data source, renderer or translation key;
3. `yassb check` — build and validate; fix what it reports.

## Project structure

<!-- feature: config.workingDir -->

```
config/default.ts            configuration (renderers, custom directives, options)
src/
  i18n/<lang>.json           translations; their names define the languages (optional)
  assets/                    copied as is to <out>/assets
  app/
    pages/                   one HTML file per page (other files, e.g. robots.txt, are copied too)
    components/              HTML/SVG/Markdown fragments included with `component`
    data-sources/            JSON files used by `create-from-data-source`
    pages-to-generate/       templates: one page per Markdown file (blog)
    styles/styles.scss       stylesheet entry (Sass, or your own `stylesParser`)
    scripts/main.ts          browser script entry (bundled with esbuild)
dist/public/                 output (`<lang>/` folders for multi-language sites)
```

All folder names can be changed with `workingDir` in the configuration (see **Configuration**).
With i18n, every page exists once per language: `src/app/pages/about.html` → `dist/public/en/about.html`,
`dist/public/it/about.html`. Without i18n: `dist/public/about.html`.

Assets get versioned names from the site's `package.json` version: `main-1-2-0.min.js`, `styles-1-2-0.min.css`.

## Styles, scripts and assets

<!-- feature: assets.copy, assets.styles, assets.scripts, assets.file-names -->

- `src/assets/` is copied as it is to `<out>/assets/` at the start of every build (unchanged files are skipped).
  Files deleted from `src/assets` stay in the output unless `cleanOut` is on.
- `src/app/styles/styles.scss` is compiled with Sass (compressed; imports resolved from the file and from the
  project root) after the pages, into `<out>/assets/css/styles-<version>.min.css`. With `stylesParser` the site
  compiles the CSS itself (PostCSS, Tailwind); `skipsStyles: true` disables the step.
- `src/app/scripts/main.ts` is bundled with esbuild for the browser (IIFE, ES2018, minified in `build`, inline
  source map in `watch`, `process.env.NODE_ENV` = `"production"`, JSX settings of `tsconfig.json`) into
  `<out>/assets/js/main-<version>.min.js`. `esbuildOptions` adds esbuild options; a legacy `webpackConfig` is
  run with the site's own webpack.
- `<version>` is the `version` of the site's `package.json` with dashes (`1.2.0` → `main-1-2-0.min.js`);
  `include-styles-src` and `include-script-src` insert the right URLs.
- Missing entry files are created empty.

## Commands

<!-- feature: cli.build, cli.watch, cli.serve, cli.new, cli.inspect, cli.check, cli.docs, cli.help -->

| Command | What it does |
|---|---|
| `yassb build` | Production build. `--strict`: exit 1 on any error. `--clean`: empty the output first. `--out <dir>`. `--json`. |
| `yassb watch` | Build, serve on http://localhost:3000 with live reload, rebuild on every change. `--port <n>`, `--clean`, `--fresh`. |
| `yassb serve` | Serve the output folder without building. `--port <n>`. |
| `yassb new <name>` | Create a project from the starter. |
| `yassb inspect [query]` | Describe the project without building (read-only). `--json` for a full manifest. |
| `yassb check` | Build, then validate. Exit code 1 if anything is an error. `--json`, `--out <dir>`, `--no-links`. |
| `yassb docs [topic]` | This guide. `yassb docs diagnostics` lists the error codes. |

Exit codes: `build` exits 1 when site code throws (renderer, directive, post processor, hook), when the
configuration cannot be loaded, or when a data source/stylesheet is invalid. Other errors (missing data source,
unknown renderer, unresolved `url-to`…) are printed with file and line but only fail the build with `--strict`
or `strict: true`.

## Build pipeline

<!-- feature: behaviour.pipeline, behaviour.post-processing, behaviour.sitemap -->

The order is stable and part of the contract with custom code:

1. Load the configuration, set folders and languages.
2. Copy `src/assets` to the output (unchanged files are skipped). Start bundling the scripts in the background.
3. Generate pages from Markdown (`generate-from-files` templates) into the output folder.
4. For each language (alphabetical):
   1. copy `src/app/pages` to `<out>/<lang>/`;
   2. list every file of the output as URLs (this is what `url-to` searches, and `sitemap.xml`);
   3. for every HTML page in `<out>/<lang>/` (copied and generated):
      `component` directives, recursively (each component is processed on its own, with its own path, before
      being inserted) → front matter placeholders → built-in directives → custom directives → translation.
5. Post-process every HTML file of the output: front matter placeholders (`{ title }`) → `postProcessors` →
   minification (`build`) or live-reload script (`watch`). Then `sitemap.xml` is deleted unless `siteHost` is set.
6. Compile the stylesheet. Write the scripts bundle.
7. `afterBuild` hook (also in watch mode).

Consequences:

- Translation runs after all directives: HTML produced by renderers can contain `data-t` and is translated.
- Post processors run after translation: the place for final URL rewriting, metadata, analytics.
- A custom directive is called for components first, then for the page. To act only on whole pages, check
  that `fileFullPath` starts with `config.workingDir.out`.
- The output folder is not emptied between builds unless `cleanOut: true` or `--clean`.

## Directives

<!-- feature: directive.attributes -->

All directives are HTML comments, except `url-to`. Attribute values use double quotes. `LANG` inside a
directive is replaced by the current language, `USERNAME` by `config.username`.

### component

<!-- feature: directive.component -->

```html
<!-- component="site/header.html" -->
```

Inserts the file (relative to `src/app/components`) and processes its directives. Supported: `.html`, `.htm`,
`.svg`, `.md`, `.txt` (Markdown is converted to HTML). Components can have front matter, whose values become
`{ key }` placeholders of the page. `<!-- component="LANG/intro.html" -->` picks a file per language
(prefer one component with `data-t` keys instead).

### create-from-data-source

<!-- feature: directive.create-from-data-source -->

```html
<!-- create-from-data-source="people/team.json" renderer="peopleCards" options="{"limit":3,"order":["Bea","Al"]}" -->
```

Reads the JSON file (relative to `src/app/data-sources`, sub-folders allowed) and replaces the comment with the
HTML returned by the renderer. `options` is JSON written as is inside the quotes; it is passed to the renderer.
Without `renderer`, the built-in `basicElement` is used. One file per directive: repeat the directive to show
several files. The directive must fit on one line.

### public-file-list

<!-- feature: directive.public-file-list -->

```html
<!-- public-file-list="assets/downloads" renderer="filesList" -->
```

Lists the files of a folder of the output (recursively) and passes `[{ absolutePath, absoluteUrl }]` to a
renderer registered in `customRenderers`.

### url-to

<!-- feature: directive.url-to -->

```html
<a href="{{ url-to="about" }}">About</a>
<a href="{{ url-to="blog-post#comments" options="{"warning":false}" }}">Comments</a>
```

Replaced by the absolute URL (`/en/about/index.html`) of the output file whose path contains the fragment (also
tried in kebab-case and snake_case). With several matches the file closest to the current page wins and a
warning is printed. Only files already written by the current build are visible: with i18n, pages of the languages
built so far. Files left in the output by an earlier build (when it is not emptied) are not visible, so the result
is the same as in a build into an empty folder.

### include-styles-src / include-script-src

<!-- feature: directive.include-styles-src, directive.include-script-src -->

```html
<!-- include-styles-src -->   → <link rel="stylesheet" href="/assets/css/styles-1-0-0.min.css">
<!-- include-script-src -->   → <script src="/assets/js/main-1-0-0.min.js"></script>
```

### generate-from-files

<!-- feature: directive.generate-from-files -->

In a template inside `src/app/pages-to-generate/`:

```html
<article>
  <h1>{ title }</h1>
  <!-- generate-from-files="blog" -->
</article>
```

One page per `.md`/`.txt` file of `src/app/blog` (recursively). Output:
`<out>/<template folder>/<file's sub-folder>/<slug>.html`; the slug is front matter `slug`, else the title in
kebab-case, else the file name. The directive must be in the template file itself (not in a component).
For a multi-language blog, put one template per language: `pages-to-generate/en/blog/post.html`,
`pages-to-generate/it/blog/post.html`.

## Renderers

<!-- feature: api.custom-renderers, renderer.basicElement, renderer.liDateDescription -->

```ts
import { RendererProps } from 'yassb-web';

interface News { title: string; date: string }

export function newsList({ source, options, lang }: RendererProps<Array<News>, { limit?: number }>): string {
  return source.slice(0, options?.limit ?? source.length)
    .map(item => `<li><time>${item.date}</time> <span data-t="NEWS.ITEM">${item.title}</span></li>`)
    .join('');
}
```

Register it: `customRenderers: { newsList }` in `config/default.ts`.

Props: `source` (parsed JSON), `sourcePath` (absolute path of the JSON file), `options` (parsed `options`
attribute), `lang` (undefined without i18n), `currentFilePath`, `config`, `frontMatterStore`.

Rules: return a string; do not write files; escape data you insert into HTML; emit UI text as
`<span data-t="KEY">English</span>` so it gets translated. A renderer that throws stops the build with the
location of the directive.

Built-in renderers:

- `basicElement`: one element per item, content `item.description` (`item.description[lang]` with i18n).
  Options: `tag` (default `span`), `attributes`.
- `liDateDescription`: `<li><u>date</u>: description</li>` per item; `date` is `{ start, end }` (`YYYY`,
  `YYYY/MM`, `YYYY/MM/DD`; `end: "-"` means present) or `{ raw }`.

## Custom directives

<!-- feature: api.custom-directives -->

For structural needs that `create-from-data-source` cannot express (selections spanning a folder, layouts).

```ts
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from 'yassb-web';

export class YearDirective implements YassbDirective {
  static regex = /<!--\s*current-year\s*-->/g;

  constructor(private args: YassbDirectiveProps) { }

  init(): YassbDirectiveResponse {
    const html = this.args.fileContents.replace(YearDirective.regex, String(new Date().getFullYear()));
    return { html, data: {} };
  }
}
```

Register it: `customDirectives: [YearDirective]`. Facts to rely on:

- `init()` is called once per regex match, each time with the page as updated by the previous call. If the
  first call replaces every occurrence, later calls see no directive: write directives to be idempotent.
- Built-in directives run first, then custom ones in the order of `customDirectives`.
- Components are processed before the page that includes them (`fileFullPath` is then the component in `src`).
- `data` values become front matter placeholders `{ key }` of the page.
- `YassbBaseDirective` (from `yassb-web`) copies the props to `this.fileContents`, `this.directiveFullString`,
  `this.config`, `this.lang`, `this.fileFullPath`.

## Translations (i18n)

<!-- feature: i18n.languages, i18n.translation, config.i18n -->

Create `src/i18n/en.json`, `src/i18n/it.json`… (flat keys; dots allowed; nested objects also work). Each file
name is a language; pages are built once per language into `<out>/<lang>/`. The first language (alphabetical)
is served at `/` by the dev server.

```html
<h1 data-t="HOME.TITLE">Welcome</h1>               <!-- text replaced by the translation -->
<p data-t>Welcome</p>                               <!-- the text itself is the key -->
<img src="logo.svg" data-attr-t alt-t="HOME.LOGO">  <!-- sets alt; works for any <attr>-t -->
<p data-t="GREETING" data-t-interpolate>…</p>       <!-- "Hi {{NAME}}": placeholders replaced -->
```

Translations are inserted as text (set `i18n: { allowHtml: true }` to insert HTML). A missing key keeps the
original text; `yassb build` prints how many are missing, `yassb check` lists them. Translation attributes are
removed from the output. Pages generated outside a language folder are not translated.

## Front matter

<!-- feature: content.front-matter, content.markdown -->

Markdown files, components and templates can start with YAML front matter:

```md
---
title: Hello world
date: 2024-01-15
slug: hello
---
```

Markdown is converted with Showdown (`showdownConverterOptions`, default `{ tables: true }`); empty files are
reported. Values replace `{ key }` placeholders (one space inside the braces) anywhere in the page: strings as they are,
dates as ISO strings, other values as JSON. Use `grayMatterOption` for excerpts
(`{ excerpt: true, excerpt_separator: '<!-- more -->' }` gives `{ excerpt }`).

## Configuration

<!-- feature: config.files, api.define-config, behaviour.site-code -->

`config/default.ts` (or `.js`, `.json`) exports the configuration. Files for environments are merged on top,
as with the `config` npm package: `config/production.ts` when `NODE_ENV=production`, `config/default-2.ts`
when `NODE_APP_INSTANCE=2`, `config/local.ts` always. `NODE_CONFIG_DIR` changes the folder.

```ts
import { defineConfig } from 'yassb-web';
import { newsList } from '../builder/renderers';

export default defineConfig({
  customRenderers: { newsList },
  siteHost: 'https://example.com'
});
```

| Option | Default | Meaning |
|---|---|---|
| `workingDir` | see Project structure | Folder names: `base`, `src`, `assets`, `i18n`, `app`, `pages`, `components`, `dataSources`, `pagesToGenerate`, `posts`, `scripts`, `styles`, `out`, `scriptsOutFolder`, `stylesOutFolder`. |
| `customRenderers` | `{}` | Renderers by name. |
| `customDirectives` | `[]` | Custom directive classes, run in this order after the built-in ones. |
| `postProcessors` | `[]` | `(html) => html`, applied to every page at the end. |
| `htmlMinificationOptions` | `{}` | html-minifier-terser options for `build`. |
| `stylesParser` | Sass | `(entry, entry, outputPath) => css` to compile styles yourself (Tailwind, PostCSS). |
| `skipsStyles` | `false` | No stylesheet. |
| `esbuildOptions` | — | Extra esbuild options for the scripts (`target`, `external`, `define`…). |
| `webpackConfig` | — | Legacy: bundle scripts with the site's own webpack. |
| `showdownConverterOptions` | `{ tables: true }` | Markdown converter options. |
| `grayMatterOption` | — | Front matter parser options. |
| `siteHost` | — | Public host; when set, `sitemap.xml` (every output file) is kept. |
| `sitemap` | `true` | `false`: never write `sitemap.xml` (`url-to` still works). |
| `cleanOut` | `false` | Empty the output (dot files kept) before building. |
| `strict` | `false` | Any error fails the build. |
| `i18n.allowHtml` | `false` | Insert translations as HTML. |
| `devServerPort` | `3000` | Port of `watch`/`serve`. |
| `username` | — | Replaces `USERNAME` in directives. |
| `beforeBuild` / `afterBuild` | — | Hooks run in `build` and `watch`; `afterBuild` receives `{ ok, diagnostics, out, … }`. |

<!-- feature: config.customRenderers, config.customDirectives, config.postProcessors, config.htmlMinificationOptions, config.stylesParser, config.skipsStyles, config.esbuildOptions, config.webpackConfig, config.showdownConverterOptions, config.grayMatterOption, config.siteHost, config.sitemap, config.cleanOut, config.strict, config.devServerPort, config.username, config.beforeBuild, config.afterBuild -->

Configuration and site code (renderers, directives) can be TypeScript or TSX: each file is compiled on its own
with the site's `tsconfig.json` (`__dirname` and relative paths work as in Node).

## Watch mode

<!-- feature: behaviour.live-reload, behaviour.dev-server -->

`yassb watch` builds, serves the output with live reload, and rebuilds on every change in the project (except
the output folder, `node_modules`, `.git`):

- builds run in processes started ahead of time: while you edit, the next one loads Node, YASSB and the packages
  your configuration imports (by loading the configuration once, without building), so a save only waits for the
  build itself. Every build loads the configuration and your code again, so keep load-time code free of side
  effects (writing files, starting servers);
- a change to site code, the configuration, `package.json`, `tsconfig.json` or any file outside `src` is built by
  a new process, so it is always picked up;
- **fast, then verified**: a content change (pages, components, data, translations, Markdown, styles) is built by
  the process that built last, which runs already-optimized code (about a third faster), and the browser reloads
  at once. Packages may keep state between builds of a process (Tailwind keeps the class names it has seen), so a
  process that never built then rebuilds the same steps into `.<out name>.yassb-verify` next to the output folder;
  files that differ are copied into the output and the browser refreshes again (stylesheets are swapped without
  reloading). The terminal prints `✓ verified in …` or `↻ verified in … differed`. That process becomes the one used for the
  next change. A save during a verification cancels it, and the next one covers its steps. The `afterBuild` hook
  also runs for verification builds, with `out` set to the verification folder, which is deleted when watch
  stops (add `*.yassb-verify/` to `.gitignore` if the output's parent folder is not ignored). `--fresh` turns this
  off: every build in a new process;
- if site code throws, the error is printed and shown in the browser in an overlay; the server keeps running,
  and the next save rebuilds;
- a stylesheet change only recompiles the styles and swaps them without reloading; a change to a file used only
  by the scripts only rebundles them; anything else rebuilds the pages (and the styles when a custom
  `stylesParser`, such as Tailwind, may depend on them).

The dev server (also used by `yassb serve`) maps `/<lang>/…` to `<out>/<lang>/…` and other paths to the first
language, then to `<out>/…`; folders redirect to a trailing slash and serve `index.html`; unknown paths serve the
home page. Files are revalidated on every request (`Cache-Control: no-cache` with an `ETag` from size and
modification time), so the browser never shows a stale file, and unchanged images, fonts and scripts are answered
with `304` instead of being downloaded again. Port: `--port`, else `devServerPort`, else 3000 (the next free port
if busy). Not for production.

Watch builds are not minified and include the live-reload script; use `yassb build` for deployment.

### One process per output folder

<!-- feature: behaviour.output-lock -->

Two YASSB processes writing the same output folder would delete and overwrite each other's files, leaving empty
or mixed pages. So only one at a time may write it: `build` and `check` hold a lock during the build, `watch` for
its whole session. A second process stops at once, writes nothing and exits with code 1:

```
error OUTPUT_LOCKED
  Another YASSB process is writing …/dist/public: `yassb watch` (pid 35695 since 20:18:02, in …/my-site). …
  hint: Stop it (Ctrl+C in its terminal, or `kill 35695`), or build into another folder with --out <dir>. If no YASSB process is running, delete …/yassb-locks/….lock.
```

The lock lives in the temporary folder of the system (never in the output). A lock left by a process that no
longer exists is taken over, and different output folders never conflict (`yassb build --out other` works while
`watch` runs).

## Diagnostics

<!-- feature: behaviour.diagnostics -->

Problems are reported with a stable code, file and line, e.g.:

```
error DATA_SOURCE_NOT_FOUND src/app/components/home.html:12
  Data source "news.json" not found at …/src/app/data-sources/news.json. The block was not rendered.
  hint: Data source paths are relative to the data-sources folder (src/app/data-sources by default).
```

`yassb docs diagnostics` lists every code. `yassb build --json` and `yassb check --json` return them as JSON.
`yassb check` adds: translation attributes left in pages, missing/inconsistent/unused translation keys, broken
local links, unused components and data sources, and packages imported by site code but not declared in
`package.json`.

## Architecture rules

Rules that keep a YASSB site easy to change, for people and agents:

**JSON is data only.** Records, content texts, dates, numbers, flags describing an item (`"highlight": true`).
Never in JSON: which items appear on which page or how many, page/category maps, UI labels, index files that
repeat what the HTML declares. One file per category; the category name is the file name.

**HTML is UI and placement.** Each block declares exactly the data it renders:
`<!-- create-from-data-source="awards.json" renderer="overviewRows" options="{"limit":1}" -->`.
`options` are for presentation only (limit, order, tone). The page HTML is the source of truth for "what is shown
where". Shared page chrome is defined once, in components.

**Code is logic.** Renderers turn declared data into markup; they keep only formatting in code (dates, number
separators, punctuation) and emit fixed UI text as `<span data-t="KEY">English</span>`. Browser scripts read
their texts from translated HTML (`data-*` attributes), never hard-code them. Custom directives are for
structural needs, not for content.

**One component per page for all languages.** Markup in the base language, every language difference through
i18n keys. Key naming: `<COMPONENT>.<NAME>`, `COMMON.<NAME>` for shared keys, `PAGE_TITLE.<NAME>`.

**Verify.** Run `yassb check` after changes. For refactors, build before and after and compare the pages:
the generated site should not change.

## Recipes

**Add a page.** Create `src/app/pages/contact.html` (copy an existing page for the shell), include shared
components with `<!-- component="…" -->`, add translation keys to every `src/i18n/*.json`. Link it with
`{{ url-to="contact" }}` or a plain `href`.

**Show a list from data.** Add `src/app/data-sources/talks.json` (an array of records), write a renderer in the
site's code, register it in `customRenderers`, then place
`<!-- create-from-data-source="talks.json" renderer="talksList" -->` where the list goes.

**Add a language.** Copy `src/i18n/en.json` to `src/i18n/de.json` and translate the values. Every page is now
also built in `<out>/de/`. Run `yassb check` to find missing keys.

**Add a blog.** Put Markdown files with front matter in `src/app/blog/`, and a template in
`src/app/pages-to-generate/blog/post.html` containing `<!-- generate-from-files="blog" -->` and `{ title }`.
Multi-language: one template per language folder (`pages-to-generate/en/blog/…`).

**Use Tailwind.** Set `workingDir.styles: 'styles/styles.css'` and a `stylesParser` that runs PostCSS with
Tailwind and returns the CSS.

## Feature catalogue

Every feature of YASSB is listed, with its syntax, options, rules, errors and status, by `yassb docs features`
(and in `docs/features.json` in the package). Use it as the checklist when writing documentation, a guide or a
website about YASSB: each feature must be covered. `yassb docs features <id>` shows one feature.

## Upgrading from 1.x

Sites built for 1.x work without changes. What is different:

- Requires Node.js 20+ (or Bun). The `config` folder and every option are read as before.
- Scripts are bundled with esbuild instead of webpack (same file name; no `.LICENSE.txt` file). `webpackConfig`
  still works if webpack is installed in the site.
- yassb-web no longer installs packages it does not need (react, react-dom, fs-extra, cheerio, lodash, moment,
  webpack, ts-node, typescript…). If your site code imports one of them without declaring it, add it to your
  `package.json`; `yassb check` lists such imports.
- Fixed: `options` containing arrays (`{"order":["a","b"]}`) were silently ignored; `$$` and `$&` in content
  were altered; `basicElement` wrote `<undefined>` tags without a `tag` option (now `span`, as documented);
  an element with both `data-attr-t` and `data-t` lost its text translation; a build into an output folder that was
  not emptied (every watch rebuild, `build` without `cleanOut`) let `url-to` and `sitemap.xml` see files of the
  previous build, so links could point to a page of another language or of a deleted source.
- New: `yassb inspect`, `yassb check`, `yassb docs`, `--strict`, `--clean`, `--json`, `sourcePath` in renderer
  props, nested translation keys, `i18n.allowHtml`, `sitemap: false`, `cleanOut`, `beforeBuild`/`afterBuild`,
  `esbuildOptions`, error overlay and CSS hot swap in watch mode.
