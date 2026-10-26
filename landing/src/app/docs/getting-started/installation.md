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
- `builder/renderers.ts`, a typed renderer;
- `src/app/pages/index.html`, components, a JSON data source, a Sass stylesheet and a TypeScript entry;
- `AGENTS.md` and `CLAUDE.md`, the rules of the project for coding agents;
- `yassb-web` as a dev dependency.

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
