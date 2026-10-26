---
title: Diagnostics
description: How problems are reported, what fails a build, and how to read them as JSON.
section: Command line
sectionOrder: 6
order: 3
slug: diagnostics
---

<!-- feature: behaviour.diagnostics, config.strict -->

<p class="lead">Every problem YASSB finds has a stable code, the source file, the line and a hint. People read them in the terminal, agents in JSON.</p>

```text
warning URL_TO_AMBIGUOUS src/app/components/nav.html:3
  Several files match "about"; using http://fake.host/it/about/index.html.
  hint: Write a longer fragment, or add options="{"warning":false}" to silence this.
```

## Where the file and line point

Pages are processed as copies in the output folder, but problems point to your sources: the page in `src/app/pages`, the component that contains the directive, the template, or the Markdown file of a generated page. A problem reported for a component and again for the page that includes it is shown once.

## What fails a build

| Level | Exit code |
|---|---|
| **fatal errors**: your code threw, the configuration does not load, invalid JSON, a broken stylesheet | 1 |
| other **errors**: missing data source, unknown renderer, unresolved `url-to`… | 0, or 1 with `--strict` / `strict: true` |
| **warnings** | 0 |

Missing translations are collected and summarised in one line; `yassb check` lists them.

## As JSON

```bash
yassb build --json
yassb check --json
```

```json
{
  "ok": false,
  "diagnostics": [
    {
      "level": "error",
      "code": "DATA_SOURCE_NOT_FOUND",
      "file": "src/app/components/home.html",
      "line": 12,
      "message": "Data source \"talk.json\" not found at …",
      "hint": "Data source paths are relative to the data-sources folder (src/app/data-sources by default).",
      "fatal": false
    }
  ]
}
```

Every code is listed, with the features that report it, in the [diagnostics reference](/docs/reference/diagnostics.html), and in the terminal with `yassb docs diagnostics`.
