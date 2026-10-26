---
title: Styles and scripts
description: Sass, Tailwind or your own CSS pipeline, and TypeScript bundled with esbuild.
section: Assets and configuration
sectionOrder: 5
order: 1
slug: styles-and-scripts
---

<!-- feature: assets.styles, assets.scripts, assets.file-names, config.stylesParser, config.skipsStyles, config.esbuildOptions, config.webpackConfig -->

<p class="lead">One stylesheet entry and one script entry, compiled into versioned files. Sass and esbuild work with zero configuration; anything else plugs in.</p>

## Styles

`src/app/styles/styles.scss` is compiled with Sass into `dist/public/assets/css/styles-<version>.min.css`, compressed. Imports are resolved from the file and from the project root, so `@use 'node_modules/…'` works. A Sass error fails the build with its file and line (`STYLES_FAILED`).

Styles are compiled after the pages, so tools that scan your HTML see everything.

## Tailwind CSS or any PostCSS pipeline

Replace Sass with `stylesParser`, a function that returns the CSS:

```ts
import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';
import { readFileSync } from 'fs';

export default {
  workingDir: { styles: 'styles/styles.css' },
  stylesParser: async (entry: string, _entry: string, output: string) => {
    const result = await postcss([tailwindcss({ optimize: { minify: true } })])
      .process(readFileSync(entry, 'utf8'), { from: entry, to: output });
    return result.css;
  }
};
```

It receives the absolute entry (twice, for compatibility) and the absolute output path, and must not write the file. This website uses exactly this, with Tailwind CSS 4. `skipsStyles: true` disables the step.

## Scripts

`src/app/scripts/main.ts` is bundled with [esbuild](https://esbuild.github.io) into `dist/public/assets/js/main-<version>.min.js`:

- imports from your files and from `node_modules`, TypeScript, JSX/TSX (settings from `tsconfig.json`);
- an IIFE for the browser, target ES2018;
- minified in `build`, with an inline source map in `watch`;
- `process.env.NODE_ENV` set to `"production"`.

Bundling starts at the beginning of the build and runs in parallel with the pages. Errors are reported with file and line (`SCRIPTS_FAILED`).

Add esbuild options with `esbuildOptions`:

```ts
export default {
  esbuildOptions: { target: 'es2020', external: ['jquery'] }
};
```

Sites written for YASSB 1 may keep a `webpackConfig`: it is run with the site's own webpack (install `webpack` and its loaders in the site).

## Versioned file names

The version comes from your `package.json`, with dashes: `1.2.0` gives `main-1-2-0.min.js` and `styles-1-2-0.min.css`. The [asset tags](/docs/directives/asset-tags.html) insert the right URLs, so bumping the version busts every cache.
