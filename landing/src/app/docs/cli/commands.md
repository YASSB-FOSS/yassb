---
title: Commands
description: Every command and flag of the yassb command line.
section: Command line
sectionOrder: 6
order: 1
slug: commands
---

<!-- feature: cli.build, cli.watch, cli.serve, cli.new, cli.inspect, cli.check, cli.docs, cli.help -->

<p class="lead">Run <code>yassb</code> in the project folder (the one containing <code>config/</code> and <code>src/</code>). With npm scripts or <code>npx yassb</code>; with Bun, <code>bunx yassb</code>.</p>

## yassb build

```bash
yassb build [--strict] [--clean] [--out <dir>] [--json]
```

Builds the site for production: pages and scripts minified. `--strict` exits with code 1 on any error, `--clean` empties the output first (dot files kept), `--out` builds into another folder, `--json` prints `{ ok, durationMs, out, diagnostics }` instead of the logs.

## yassb watch

```bash
yassb watch [--port <n>] [--clean] [--strict]
```

Builds, serves the site with live reload and rebuilds on every change. `--port 0` picks any free port. See [Watch mode](/docs/cli/watch-mode.html).

## yassb serve

```bash
yassb serve [--port <n>]
```

Serves the output folder as it is, without building, with the same routing as `watch`.

## yassb new

```bash
yassb new <name>
```

Creates a project in `./<name>` (kebab-case). See [Installation](/docs/getting-started/installation.html).

## yassb inspect

```bash
yassb inspect [query] [--json]
```

Describes the project without building it: pages, components, data sources, renderers, directives with file and line, translations. A query narrows it down to a file, data source, renderer, directive or translation key. See [Working with coding agents](/docs/getting-started/agents.html).

## yassb check

```bash
yassb check [--json] [--out <dir>] [--no-links]
```

Builds the site and validates it; exit code 1 on errors. `--no-links` skips the link check.

## yassb docs

```bash
yassb docs [topic] [--list]
yassb docs features [id] [--json]
```

Prints this documentation in the terminal, a topic of it, or the feature catalogue.

## Help and version

```bash
yassb help        # or --help, -h
yassb --version   # or -v
```

An unknown command prints the help and exits with code 1.

## From code

The same operations are available as functions, running in the current folder:

```ts
import { checkProject, inspectProject, runBuild } from 'yassb-web';

const result = await runBuild({ strict: true });
const manifest = inspectProject();
const report = await checkProject();
```
