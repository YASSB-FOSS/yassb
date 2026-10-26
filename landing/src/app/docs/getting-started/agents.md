---
title: Working with coding agents
description: How YASSB helps agents understand a site, change it and verify the change.
section: Getting started
sectionOrder: 1
order: 4
slug: agents
---

<!-- feature: cli.inspect, cli.check, cli.docs -->

<p class="lead">A coding agent needs three things: a map of the project, the rules of the tool, and a way to know whether its change worked. YASSB ships all three in the command line.</p>

## 1. Get the map: `yassb inspect`

```bash
npx yassb inspect
```

```text
YASSB project my-site@1.0.0 (yassb-web 2.0.0)
Languages: en, it (from src/i18n/*.json; first one served at /)

Pages (4):
  src/app/pages/index.html  "Home"
    components: site/footer.html, site/header.html
    data: talks.json→talkList, team/people.json→peopleCards
Data sources (3):
  talks.json        array(12) of {date, title, place}  ← src/app/pages/index.html:18
Renderers:
  talkList          custom    used 2×
```

`inspect` is read-only: it loads the configuration but never runs a renderer or writes a file. Ask about one thing with a query, or get everything as JSON:

```bash
npx yassb inspect talks.json        # where a data source is used
npx yassb inspect talkList          # where a renderer is used
npx yassb inspect HOME.TITLE        # a translation key in every language
npx yassb inspect --json            # the full manifest
```

The manifest lists pages and their output paths, components (transitively), every directive with file and line, data sources with their shape, renderers, custom directives, post processors, hooks, assets and translation keys, plus the problems visible without building (missing files, unknown renderers, invalid options).

## 2. Learn the rules: `yassb docs`

```bash
npx yassb docs                 # this guide, in the terminal
npx yassb docs directives      # one topic
npx yassb docs features        # every feature of YASSB, the checklist
npx yassb docs features directive.url-to
```

The guide ships with the package, so it always matches the installed version and works offline.

## 3. Verify: `yassb check`

```bash
npx yassb check
```

`check` builds the site and then validates it. Besides every problem of the build, it reports translation attributes left in pages, keys missing in some language, keys never used, broken local links, components and data sources nobody uses, and packages your code imports without declaring them. The exit code is 1 when there are errors, so an agent can loop until it is 0.

## Errors an agent can act on

Every problem has a stable code, a file, a line and a hint:

```text
error DATA_SOURCE_NOT_FOUND src/app/components/home.html:12
  Data source "talk.json" not found at …/src/app/data-sources/talk.json. The block was not rendered.
  hint: Data source paths are relative to the data-sources folder (src/app/data-sources by default).
```

`yassb build --json` and `yassb check --json` return the same information as JSON. See [Diagnostics](/docs/cli/diagnostics.html).

## Project rules in `AGENTS.md`

New projects include an `AGENTS.md` (and a `CLAUDE.md` that points to it) with the commands and the architecture rules of a YASSB site:

- JSON is data only: never page placement, never UI labels;
- HTML is UI and placement: each block declares the data it renders;
- TypeScript is logic: renderers return strings and emit UI text as translation keys;
- run `npm run check` after every change.

> **Agents** A good first prompt: "Run `npx yassb inspect`, read AGENTS.md, then …". The answer to "where does this come from?" is always a directive you can find with `inspect`.
