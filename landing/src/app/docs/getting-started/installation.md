---
title: Installation
description: Create a YASSB project, run the dev server and build for production.
section: Getting started
sectionOrder: 1
order: 2
slug: installation
---

<!-- feature: cli.new -->

<p class="lead">YASSB needs Node.js 20 or newer, or Bun. One command creates a working project.</p>

## Create a project

```bash
npx yassb-web new my-site
cd my-site
npm install
```

`yassb new` creates the folder (the name is converted to kebab-case) and refuses to overwrite a folder that is not empty. The starter contains:

- `config/default.ts`, the configuration, with one renderer registered;
- `builder/renderers.ts`, a typed renderer, and `builder/styles.ts`, how the stylesheet is compiled;
- `src/app/pages/index.html`, components, a JSON data source, a stylesheet and a TypeScript entry;
- `AGENTS.md` and `CLAUDE.md`, the rules of the project for coding agents, with a "Setup" section describing the presets;
- `yassb-web` and `@types/node` as dev dependencies.

## Choose a setup

Presets set up a common stack without starting from zero. Pick one per axis:

```bash
npx yassb-web new my-site --styles tailwind --scripts alpine --deploy github-pages
```

| Flag | Presets |
|---|---|
| `--styles` | `sass` (default), `tailwind` (Tailwind CSS 4), `css` (plain modern CSS), `bootstrap` (Bootstrap 5, from Sass), `pico` (Pico CSS, classless) |
| `--scripts` | `typescript` (default), `alpine` (Alpine.js) |
| `--deploy` | `github-pages` (GitHub Actions workflow, with [`relativeUrls`](/docs/configuration/options.html) on so the site works under `/<repository>/`), `netlify` (`netlify.toml`) |

A styles preset brings its own pages and components, written for that framework. The packages it needs are added to `devDependencies`: `npm install` installs them. Without flags the project uses Sass and TypeScript and has no deploy files.

## Develop

```bash
npm run watch
```

The site is served on `http://localhost:3000` and rebuilt on every change, with live reload. See [Watch mode](/docs/cli/watch-mode.html).

## Build

```bash
npm run build
```

The output goes to `dist/public`, minified and ready to upload to any static host. Run `npm run check` before deploying: it builds and validates the site.

## Add YASSB to an existing folder

```bash
npm install --save-dev yassb-web
```

Create `config/default.ts` and `src/app/pages/index.html`; every other folder is optional and created on the first build. Add the scripts to `package.json`:

```json
{
  "scripts": {
    "build": "yassb build",
    "watch": "yassb watch",
    "check": "yassb check"
  }
}
```

> **Note** With Bun, run the same commands with `bunx yassb …`. Builds are a little faster.
