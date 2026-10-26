---
title: Options
description: Every option of the YASSB configuration.
section: Assets and configuration
sectionOrder: 5
order: 3
slug: options
---

<!-- feature: config.workingDir, config.customRenderers, config.customDirectives, config.postProcessors, config.htmlMinificationOptions, config.stylesParser, config.skipsStyles, config.esbuildOptions, config.webpackConfig, config.showdownConverterOptions, config.grayMatterOption, config.siteHost, config.sitemap, config.cleanOut, config.strict, config.devServerPort, config.username, config.i18n, config.beforeBuild, config.afterBuild -->

<p class="lead">Every option is optional. Types come with the package: <code>YassbConfig</code>, or <code>defineConfig()</code>.</p>

| Option | Default | Meaning |
|---|---|---|
| `workingDir` | see [Project structure](/docs/getting-started/project-structure.html) | folder names |
| `customRenderers` | `{}` | [renderers](/docs/concepts/data-and-renderers.html) by name; a name of a built-in replaces it |
| `customDirectives` | `[]` | [custom directive](/docs/directives/custom-directives.html) classes, run in this order |
| `postProcessors` | `[]` | `(html) => html` applied to every page at the end ([pipeline](/docs/concepts/build-pipeline.html)) |
| `htmlMinificationOptions` | `{}` | html-minifier-terser options for `build` |
| `stylesParser` | Sass | your own CSS compiler ([styles](/docs/configuration/styles-and-scripts.html)) |
| `skipsStyles` | `false` | no stylesheet |
| `esbuildOptions` | — | extra esbuild options for the scripts |
| `webpackConfig` | — | legacy: bundle scripts with the site's webpack |
| `showdownConverterOptions` | `{ tables: true }` | Markdown options |
| `grayMatterOption` | — | front matter options (excerpts) |
| `siteHost` | — | public host; keeps `sitemap.xml` (end it with `/`) |
| `sitemap` | `true` | `false` never writes `sitemap.xml` |
| `cleanOut` | `false` | empty the output before building (dot files such as `.git` are kept) |
| `strict` | `false` | any reported error fails the build |
| `i18n.allowHtml` | `false` | insert translations as HTML |
| `devServerPort` | `3000` | port of `watch` and `serve` |
| `username` | — | replaces `USERNAME` in directives |
| `beforeBuild` | — | hook before every build, in `build` and `watch` |
| `afterBuild` | — | hook after every build, with `{ ok, diagnostics, out, durationMs, watchMode }` |

## cleanOut

Without it, files you delete from the sources stay in the output. With `cleanOut: true` (or `yassb build --clean`) the output folder is emptied first, keeping dot files at its root, so a deployment repository in the output folder survives. In watch mode only full rebuilds clean; a styles-only rebuild keeps the pages.

## strict

By default only problems that make the build unusable exit with code 1: exceptions in your code, invalid JSON, a configuration that does not load, a broken stylesheet. Everything else is printed with file and line. With `strict: true` (or `--strict`) every error fails the build. Warnings never do.
