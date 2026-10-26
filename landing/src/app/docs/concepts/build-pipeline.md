---
title: Build pipeline
description: The exact order in which YASSB builds a site, and where to hook in.
section: Core concepts
sectionOrder: 2
order: 3
slug: build-pipeline
---

<!-- feature: behaviour.pipeline, behaviour.post-processing, behaviour.sitemap, config.postProcessors, config.htmlMinificationOptions, config.beforeBuild, config.afterBuild -->

<p class="lead">Every build runs the same steps in the same order. Custom code can rely on it.</p>

## The steps

1. Load the configuration, set folders and languages, run `beforeBuild`.
2. Copy `src/assets` to the output; start bundling the scripts in the background.
3. Generate pages from Markdown (`generate-from-files` templates).
4. For each language, in alphabetical order:
   1. copy every file of `src/app/pages` to `<out>/<lang>/`;
   2. list every file of the output as URLs (used by `url-to`, written to `sitemap.xml`);
   3. process each HTML page: **components** → **front matter** → **built-in directives** → **custom directives** → **translation**.
5. Post-process every HTML file of the output: front matter placeholders → `postProcessors` → minification (or the live-reload script in watch mode).
6. Compile the stylesheet, write the scripts bundle.
7. Run `afterBuild`.

A directive still in a page after step 4 is reported as `DIRECTIVE_UNPROCESSED`: its content is missing.

## Consequences

- Translation runs after every directive, so HTML produced by renderers is translated too.
- Post processors see the final, translated page: the place for URL rewriting, metadata, analytics.
- Custom directives run on components first and on the page last.
- The output folder is not emptied between builds unless `cleanOut` is on.

## Post processors

```ts
export default {
  postProcessors: [
    (html: string) => html.replace('</body>', '<script src="/stats.js" defer></script></body>')
  ]
};
```

They run in order, on every HTML file of the output, in `build` and in `watch`. A post processor that throws or returns something other than a string fails the build (`POST_PROCESSOR_FAILED`).

## Minification

`yassb build` minifies every page with [html-minifier-terser](https://github.com/terser/html-minifier-terser). The default (`{}`) changes almost nothing; most sites want:

```ts
export default {
  htmlMinificationOptions: {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true
  }
};
```

`yassb watch` never minifies. A page the minifier cannot parse is written unminified and reported (`MINIFY_FAILED`).

## Hooks

```ts
export default {
  beforeBuild: ({ watchMode, out, langs }) => console.log(`Building ${langs.join(', ')} into ${out}`),
  afterBuild: result => {
    if (!result.ok)
      console.error(`${result.diagnostics.length} problem(s)`);
  }
};
```

Both run in `build` and in `watch` (unlike npm `prebuild`/`postbuild` scripts), which makes `afterBuild` the place for site-specific validations. A hook that throws fails the build (`HOOK_FAILED`). This website uses `afterBuild` to write the search index of these docs.

## sitemap.xml

Before each language is processed, YASSB lists every file of the output (pages, assets, everything) as URLs. That list is what `url-to` searches, and it is written to `<out>/sitemap.xml`.

- Without `siteHost` the host is `http://fake.host/` and the file is deleted at the end of the build.
- With `siteHost: 'https://example.com/'` the file is kept, with your host.
- With `sitemap: false` it is never written; `url-to` keeps working.

A post processor can write its own `sitemap.xml`: it runs after YASSB's.
