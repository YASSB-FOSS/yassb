---
title: Watch mode
description: The dev server, live reload, the error overlay and how rebuilds work.
section: Command line
sectionOrder: 6
order: 2
slug: watch-mode
---

<!-- feature: cli.watch, behaviour.dev-server, behaviour.live-reload, config.devServerPort -->

<p class="lead"><code>yassb watch</code> builds the site, serves it, and rebuilds whenever a file changes. Your browser reloads by itself, and errors show up on the page.</p>

## What is watched

The whole project, except the output folder, `node_modules`, `.git` and temporary files of editors. That includes the configuration, your renderers and directives, `package.json` and `tsconfig.json`.

## Every build is fresh

Each rebuild runs in a new process. Nothing is cached between builds, so:

- changes to the configuration and to the code it imports are always picked up;
- if your code throws, the error is printed and shown in the browser, and the server keeps running: fix the file and save.

## Only what changed is rebuilt

| You change | YASSB rebuilds |
|---|---|
| a stylesheet | the styles only; the browser swaps the CSS without reloading |
| a file used only by the scripts | the scripts only |
| pages, components, data, translations, Markdown | the pages (and the styles, when a custom `stylesParser` such as Tailwind scans them) |
| configuration, site code, `package.json`, anything outside `src` | everything |

Changes made while a build is running are queued into one more build.

## Live reload and the error overlay

Pages get a small script, injected before `</body>`, connected to the dev server:

- a badge shows while a rebuild runs;
- the page reloads when it is done (or only the CSS is swapped);
- the errors of the last build appear in an overlay at the bottom of the page, with code, file and line, and disappear when fixed.

The `Content-Security-Policy` meta tag is removed in watch mode so that the script can run. Pages are not minified.

## The dev server

`http://localhost:3000`, or `devServerPort`, or `--port`; if the port is busy the next one is used.

- `/<lang>/…` serves `<out>/<lang>/…`; other paths are looked up in the first language, then in the output root;
- folders redirect to a trailing slash and serve their `index.html`;
- unknown paths serve the home page.

> **Warning** The dev server is for development only. Deploy the output folder of `yassb build` to a static host.
