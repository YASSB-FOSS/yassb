---
title: Configuration files
description: Where the configuration lives, how environments are merged, and TypeScript support.
section: Assets and configuration
sectionOrder: 5
order: 2
slug: configuration-files
---

<!-- feature: config.files, api.define-config, behaviour.site-code -->

<p class="lead">The configuration is the default export of <code>config/default.ts</code>. Files for other environments are merged on top.</p>

```ts
import { defineConfig } from 'yassb-web';
import { talkList } from '../builder/renderers';

export default defineConfig({
  customRenderers: { talkList },
  siteHost: 'https://example.com/'
});
```

`defineConfig` only adds types; `export default { … } as YassbConfig` works too (and does not need `yassb-web` at runtime).

## Environments

The `config` folder is read with the same rules as the popular [config](https://www.npmjs.com/package/config) package, which YASSB 1 used:

| File | Loaded when |
|---|---|
| `default.ts` | always |
| `production.ts` | `NODE_ENV=production` (or `NODE_CONFIG_ENV`) |
| `default-2.ts` | `NODE_APP_INSTANCE=2` |
| `<hostname>.ts` | on that machine |
| `local.ts` | always, last |

Files are merged in that order: objects deeply, arrays and functions replaced. `NODE_CONFIG_DIR` changes the folder, and `NODE_CONFIG` (JSON) is merged last. Extensions: `.ts`, `.js`, `.cjs`, `.mts`, `.cts`, `.tsx`, `.json`. Other formats (YAML, TOML…) are reported and skipped (`CONFIG_UNSUPPORTED_FILE`).

## TypeScript everywhere

The configuration and everything it imports (renderers, directives, helpers) can be TypeScript or TSX, without installing TypeScript:

- under Node, each file is compiled on its own with esbuild, using your `tsconfig.json`: `__dirname`, relative paths and `require` work as usual, and stack traces point to your TypeScript lines;
- under Bun, TypeScript runs natively;
- types are not checked during the build; run `tsc --noEmit` for that.

A syntax error is reported with file and line; a missing package is explained, including packages YASSB 1 used to install for you (`CONFIG_MODULE_NOT_FOUND`).

> **Note** In watch mode every build runs in a fresh process, so changes to the configuration and to the code it imports are always picked up.
