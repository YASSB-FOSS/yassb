# YASSB website

The website and documentation of YASSB (https://yassb-foss.github.io), built with YASSB itself from this repository.

## Commands

```bash
bun install          # Tailwind CSS 4, typography, highlight.js, PostCSS (the engine comes from ../)
bun run watch        # http://localhost:3000, uses ../bin.js (build the engine first: cd .. && bun run build)
bun run build        # → YASSB-FOSS.github.io (a separate git repository, kept by cleanOut)
bun run check        # build + validation
bun run inspect
```

## Structure

| Path | What |
|---|---|
| `src/app/pages/index.html` | Home page (Radiant-style), made of `src/app/components/home/*` |
| `src/app/docs/<section>/*.md` | Documentation pages (Syntax-style). Front matter: `title`, `description`, `section`, `sectionOrder`, `order`, `slug` |
| `src/app/pages-to-generate/docs/page.html` | Template of every docs page (`generate-from-files="docs"`) |
| `src/app/components/site`, `docs` | Head, logo, docs header, search dialog |
| `builder/renderers.ts` | `docsNav`, `docsPager` (from `public-file-list="docs"` + front matter), `featureReference`, `diagnosticsReference`, `featureCount` (from `../docs/features.json`) |
| `builder/post-processors.ts` | Code highlighting, callouts (`> **Note**`, `Tip`, `Warning`, `Agents`), "On this page" |
| `builder/search-index.ts` | `afterBuild` hook writing `docs/search.json` for the ⌘K search |
| `builder/showdown.ts` | Escapes `{` in Markdown code so YASSB syntax in examples is not executed |
| `src/app/scripts/` | Theme toggle, search, TOC highlight, copy buttons, mobile navigation |

## Rules

- **Every feature of YASSB must be documented here.** The build of the engine (`bun run build` in the repository
  root) fails if a feature id of `docs/features.json` is not referenced in `src/app/docs` with
  `<!-- feature: id -->`. Put the marker at the top of the page that explains the feature, and explain it:
  usage, options, rules, errors (see `yassb docs features <id>` for what to cover).
- The feature reference and the diagnostic codes are rendered from the catalogue: never copy them by hand.
- Examples of YASSB syntax go in code (fenced or inline): `{` is escaped there, so `{{ url-to }}` and
  `{ title }` are shown, not executed. Never write a directive or a placeholder in plain text.
- Order of the sidebar: `sectionOrder` then `order` in the front matter.
- Claims about numbers (speed, dependencies) must match measurements; no invented testimonials or logos.
- Run `bun run check` before committing: 0 errors, 0 warnings.
