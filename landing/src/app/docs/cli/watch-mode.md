---
title: Watch mode
description: The dev server, live reload, the error overlay and how rebuilds work.
section: Command line
sectionOrder: 6
order: 2
slug: watch-mode
---

<!-- feature: cli.watch, behaviour.dev-server, behaviour.live-reload, config.devServerPort, behaviour.output-lock -->

<p class="lead"><code>yassb watch</code> builds the site, serves it, and rebuilds whenever a file changes. Your browser reloads by itself, and errors show up on the page.</p>

## What is watched

The whole project, except the output folder, `node_modules`, `.git` and temporary files of editors. That includes the configuration, your renderers and directives, `package.json` and `tsconfig.json`.

## Fast, then verified

Builds run in processes started ahead of time. While you edit, the next one loads Node, YASSB and the packages your configuration imports (it loads the configuration once, without building), so a save only waits for the build itself. Every build loads the configuration and your code again, so keep code that runs at load time free of side effects (writing files, starting servers).

- **Code changes** (configuration, renderers, directives, `package.json`, `tsconfig.json`, anything outside `src`) are built by a new process, so they are always picked up.
- **Content changes** (pages, components, data, translations, Markdown, styles) are built by the process that built last: its code is already optimized, about a third faster, and the browser reloads at once.
- Then **a process that never built** rebuilds the same steps into `.<out name>.yassb-verify`, next to the output folder. Packages can keep state between builds of a process (Tailwind keeps the class names it has seen), so files that differ are copied into the output and the browser refreshes again; stylesheets are swapped without reloading. The terminal prints `✓ Verified` or `↻ Verified … differed`. That process is used for the next change.
- A save during a verification cancels it; the next one covers its steps.
- The `afterBuild` hook also runs for verification builds, with `out` set to the verification folder, which is deleted when watch stops. If the output's parent folder is not ignored by git, add `*.yassb-verify/` to `.gitignore`.
- `yassb watch --fresh` turns this off: every build runs in a new process.

If your code throws, the error is printed and shown in the browser, and the server keeps running: fix the file and save.

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
- every file is revalidated on each request (`no-cache` with an `ETag`), so the browser never shows a stale file and does not download unchanged images, fonts and scripts again.

## One process per output folder

Two YASSB processes writing the same output folder would overwrite each other's files and leave empty or mixed pages. So only one at a time may write it: `build` and `check` hold a lock during the build, `watch` for its whole session.

Start a second one on the same folder and it stops at once, writes nothing and exits with code 1:

```text
error OUTPUT_LOCKED
  Another YASSB process is writing …/dist/public: `yassb watch` (pid 35695 since 20:18:02, in …/my-site).
  Two processes writing the same folder corrupt each other's pages, so nothing was written.
  hint: Stop it (Ctrl+C in its terminal, or `kill 35695`), or build into another folder with --out <dir>. If no YASSB process is running, delete …/yassb-locks/….lock.
```

- The lock lives in the temporary folder of the system, never in the output, so it is never deployed.
- A lock left by a process that no longer exists (a crash, `kill -9`) is taken over automatically.
- Different folders never conflict: `yassb build --out preview` works while `watch` runs.

> **Warning** The dev server is for development only. Deploy the output folder of `yassb build` to a static host.
