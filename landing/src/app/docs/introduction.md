---
title: Introduction
description: YASSB builds static sites from HTML, JSON, Markdown and TypeScript, and is built to be worked on by coding agents.
section: Getting started
sectionOrder: 1
order: 1
slug: index
---

<p class="lead">YASSB is a static site builder with a simple contract: data in JSON or Markdown, UI in HTML, logic in TypeScript. It is small, fast, and built so that a coding agent can understand a site in seconds and change it without breaking it.</p>

<div class="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
  <a href="/docs/getting-started/installation.html" class="group relative rounded-xl border border-slate-200 p-6 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-500/40 dark:hover:bg-slate-800/50">
    <h2 class="font-display text-base text-slate-900 dark:text-white">Installation</h2>
    <p class="mt-1 text-sm text-slate-700 dark:text-slate-400">Create a project and run the dev server in under a minute.</p>
  </a>
  <a href="/docs/getting-started/agents.html" class="group relative rounded-xl border border-slate-200 p-6 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-500/40 dark:hover:bg-slate-800/50">
    <h2 class="font-display text-base text-slate-900 dark:text-white">Working with coding agents</h2>
    <p class="mt-1 text-sm text-slate-700 dark:text-slate-400">inspect, check, docs: how an agent finds its way in a YASSB site.</p>
  </a>
  <a href="/docs/concepts/data-and-renderers.html" class="group relative rounded-xl border border-slate-200 p-6 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-500/40 dark:hover:bg-slate-800/50">
    <h2 class="font-display text-base text-slate-900 dark:text-white">Data and renderers</h2>
    <p class="mt-1 text-sm text-slate-700 dark:text-slate-400">Turn JSON into HTML with a TypeScript function.</p>
  </a>
  <a href="/docs/reference/features.html" class="group relative rounded-xl border border-slate-200 p-6 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-500/40 dark:hover:bg-slate-800/50">
    <h2 class="font-display text-base text-slate-900 dark:text-white">Feature reference</h2>
    <p class="mt-1 text-sm text-slate-700 dark:text-slate-400">Every feature, with syntax, options, rules and errors.</p>
  </a>
</div>

## The mental model

A YASSB site has three kinds of files, each with one job:

| What | Where | Written in |
|---|---|---|
| **Data**: records, texts, dates, flags | `src/app/data-sources/*.json`, Markdown files | JSON, Markdown |
| **UI**: markup, and what is shown where | `src/app/pages/`, `src/app/components/` | HTML with directives |
| **Logic**: turning data into markup | renderers and directives registered in `config/default.ts` | TypeScript |

Pages are plain HTML. **Directives** are HTML comments that YASSB replaces when it builds:

```html
<header>
  <!-- component="site/header.html" -->
</header>
<ul class="talks">
  <!-- create-from-data-source="talks.json" renderer="talkList" options="{"limit":3}" -->
</ul>
```

A **renderer** is a function that receives the parsed JSON and returns HTML:

```ts
import { RendererProps } from 'yassb-web';

export function talkList({ source, options }: RendererProps<Array<{ title: string }>, { limit?: number }>): string {
  return source.slice(0, options?.limit).map(talk => `<li>${talk.title}</li>`).join('');
}
```

Because every block of a page declares exactly the data it shows, you can read a page and know where everything comes from, and so can an agent.

## Why YASSB

- **Built for agents.** `yassb inspect` describes a site with file and line numbers, `yassb check` validates a change, `yassb docs` ships the whole guide offline, and every error has a stable code.
- **Small.** Five runtime dependencies. Runs on Node.js 20+ and Bun.
- **Fast.** esbuild for scripts and TypeScript, a translator that only touches translated elements, in-memory URL lookups.
- **Fast, robust watch mode.** Code changes are built by a new process, so changes to the config and to your renderers are always picked up; content changes are built by a warm process and then verified by a clean one; a crash in your code shows up in the browser without stopping the server.
- **Multi-language, Markdown, Sass or Tailwind** out of the box.

> **Agents** Starting on an existing YASSB site? Run `npx yassb inspect`, then read `AGENTS.md` if the project has one. `npx yassb docs` prints this documentation in the terminal.
