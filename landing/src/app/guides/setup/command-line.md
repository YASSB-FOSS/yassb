---
title: Command line and coding agents
slug: command-line
order: 3
category: Setup
---
# Command line and coding agents

| Command | What it does |
|---|---|
| `yassb build` | Production build. `--strict` fails on any error, `--clean` empties the output first, `--out <dir>`, `--json`. |
| `yassb watch` | Build, serve on `http://localhost:3000` with live reload, rebuild on every change. `--port <n>`, `--clean`. |
| `yassb serve` | Serve the output folder without building. |
| `yassb new <name>` | Create a project (with `AGENTS.md` for coding agents). |
| `yassb inspect [query]` | Describe the project without building it: pages, components, data sources, renderers, directives, translations, with file and line. `--json` for a machine-readable manifest. |
| `yassb check` | Build and validate: missing data sources and renderers, unprocessed directives, missing or inconsistent translations, broken local links, undeclared dependencies. Exit code 1 on errors. |
| `yassb docs [topic]` | The complete guide, by topic (`yassb docs --list`). |

## Errors

Every problem is reported with a code, the source file and the line:

    error DATA_SOURCE_NOT_FOUND src/app/components/home.html:12
      Data source "news.json" not found at …/src/app/data-sources/news.json. The block was not rendered.
      hint: Data source paths are relative to the data-sources folder (src/app/data-sources by default).

In `watch` mode errors are also shown in the browser, and the dev server keeps running when your code throws:
fix the file, save, and the site is rebuilt.

## Coding agents

YASSB sites separate data (JSON), UI (HTML with directives) and logic (TypeScript renderers), which makes them
easy to change for coding agents. Point your agent to:

- `yassb docs` for the rules and the reference, available offline in every project;
- `yassb inspect` to discover how a site is built before changing it;
- `yassb check` to verify its changes.

The documentation is also available as plain text at [/llms.txt](/llms.txt).
