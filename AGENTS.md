# Working on YASSB

This file is for people and coding agents changing the YASSB engine itself. To *use* YASSB in a site, read
`docs/guide.md` (also printed by `yassb docs`).

## Commands

```bash
bun install          # dependencies (bun.lock)
bun run build        # tsc → dist/ (CommonJS + .d.ts); bin.js runs dist/cli/cli.js
bun run typecheck    # tsc --noEmit on src
bun test             # unit + integration tests (builds dist first with `bun run test`)
bun run test         # build + all tests
```

Try the CLI on a fixture: `cd test/fixtures/kitchen-sink && node ../../../bin.js inspect` (fixtures need
`node_modules/yassb-web` → repo root for `build`; the tests set this up in `test/.tmp`).

## Map of the code

| Path | Responsibility |
|---|---|
| `src/cli/cli.ts` | Entry point: argument parsing, help, command dispatch. |
| `src/cli/commands/*.ts` | One file per command: `build`, `watch`, `serve`, `new`, `inspect`, `check`, `docs`. |
| `src/cli/build-worker.ts` | Child process used by `watch`: one build, results over IPC. |
| `src/pipeline/build.ts` | **The build pipeline** (`runBuild`). Read its header comment first. |
| `src/config/load-config.ts` | Reads `config/` like the `config` npm package (default/env/instance/local, deep merge). |
| `src/config/ts-require-hook.ts` | Compiles site `.ts/.tsx` on `require` with esbuild (Node only; Bun is native). |
| `src/config/setup.function.ts` | Per-run setup: resets stores, loads config, sets `WORKING_DIR` and `LANGS`. |
| `src/directives/directives-parser.class.ts` | `component` directive (recursive) and the per-file directive order. |
| `src/directives/directives-helpers/directives-invoker.class.ts` | Runs built-in then custom directives. |
| `src/directives/*/` | Built-in directives, one folder each. |
| `src/directives/files-content-injector.class.ts` | Processes every page of a language: directives → translation. |
| `src/i18n/translator.class.ts` | `data-t` / `data-attr-t` translation (edits only translated elements). |
| `src/html/html-scanner.ts` | Lenient HTML tokenizer + element extents (translator, check, inspect, tests). |
| `src/renderers/` | Renderer store, caller (fallback + error reporting), built-in renderers. |
| `src/post-processing/` | Front matter placeholders, `postProcessors`, minification / live-reload script. |
| `src/assets/` | Asset copy (incremental), esbuild scripts, Sass/custom styles, versioned file names. |
| `src/sitemap/sitemap-generator.class.ts` | URL list of the output (`url-to`) and `sitemap.xml`. |
| `src/server/` | Dev server (node:http) and live reload (Server-Sent Events + overlay script). |
| `src/watch/project-watcher.ts` | Native `fs.watch` with ignores and debounce. |
| `src/inspect/project-inspector.ts` | Static manifest for `yassb inspect` (never builds). |
| `src/check/site-checks.ts` | Post-build validations for `yassb check`. |
| `src/diagnostics/` | Diagnostic codes, collection, printing, mapping output files back to sources. |
| `src/yassb.ts` | Public types. `src/index.ts`: public API. `src/tools.ts`: `yassb-web/tools` (1.x compat). |
| `docs/guide.md` | User/agent guide, shipped in the package. Keep it in sync with behaviour. |
| `templates/starter/` | Files of `yassb new`. |
| `landing/` | The project website, a real YASSB site (React TSX renderers, Tailwind 2). |
| `test/` | `bun test` suites, fixtures and the comparison helper. |

Global state lives in a few explicit stores, all reset by `resetBuildState()` at the start of every run:
`WORKING_DIR`, `LANGS`, `RENDERERS_STORE`, `FRONT_MATTER_DATA_STORE`, `GENERATED_PAGES`, `SITEMAP_URLS`,
`DIAGNOSTICS`, the file cache. In watch mode every build is a new process anyway.

## Compatibility contract

Existing sites must keep building with the same output. Do not change, without a major version and a note in
`docs/guide.md` → "Upgrading":

- the directive regexes and attribute syntax (`LANG`, `USERNAME`, `options` JSON);
- the pipeline order in `src/pipeline/build.ts` and the per-file order (components → front matter → built-in →
  custom → translation);
- that custom directives get `init()` once per match, components before pages, and `fileFullPath` in `src` for
  components and in `out` for pages;
- the `config/` loading rules and every option of `YassbConfig`;
- output paths and asset names (`<name>-<version>.min.<ext>`), `sitemap.xml` rules, `url-to` resolution;
- the public types and `yassb-web/tools`.

`test/compat.test.ts` builds `test/fixtures/kitchen-sink` and compares it with the output of yassb-web 1.4.3
(`expected-1.4.3/`); only the differences listed there (documented bug fixes) are allowed. If a change makes
that test fail, either fix the change or, for an intended fix, add it to the allowlist and to the guide.

## Conventions

- TypeScript, strict, CommonJS output. Runtime dependencies are kept to five (esbuild, gray-matter,
  html-minifier-terser, sass, showdown): prefer Node built-ins; do not add a dependency without a strong reason.
- Heavy modules (`esbuild`, `sass`, `html-minifier-terser`) are `require`d lazily inside functions.
- Problems are reported with `report()` (`src/diagnostics/diagnostics.ts`) using a code from `DIAGNOSTIC_CODES`,
  with file and line (`locate()`), never with bare `console.error`. Mark `fatal: true` only for what made 1.x
  crash (exceptions from site code, invalid JSON, config errors).
- Use `replaceAllLiteral`/`replaceFirstLiteral` for inserting generated HTML (no regex, no `$` patterns).
- Comments explain behaviour and contracts, briefly. Keep `docs/guide.md` and `yassb docs` accurate.
