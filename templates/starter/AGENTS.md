# PROJECT_NAME

A static site built with YASSB (`yassb-web`).

## Commands

```bash
npm run watch      # dev server with live reload on http://localhost:3000
npm run build      # production build into dist/public
npm run check      # build + validation (run it after every change)
npx yassb inspect  # what the site is made of: pages, components, data, renderers (read-only)
npx yassb docs     # the YASSB guide: directives, renderers, i18n, configuration
```

## How this site is organised

- `src/app/pages/` — one HTML file per page. `src/app/components/` — shared fragments,
  included with `<!-- component="name.html" -->`.
- `src/app/data-sources/*.json` — data only (records, texts that are content). Never page placement or labels.
- `builder/` — renderers (TypeScript) that turn data into HTML, registered in `config/default.ts`.
  A page shows data with `<!-- create-from-data-source="file.json" renderer="name" -->`.
- `src/app/styles/styles.scss`, `src/app/scripts/main.ts` — stylesheet and browser script entries.
- `src/assets/` — copied as is.

## Rules

- JSON is data, HTML is UI and placement, TypeScript is logic (`npx yassb docs architecture-rules`).
- Each block in the HTML declares the data it renders; `options` are for presentation only.
- Renderers return strings, escape inserted text, and never write files.
- For a multi-language site, add `src/i18n/<lang>.json` files and mark text with `data-t="KEY"`
  (`npx yassb docs translations`).
- After changes run `npm run check` and fix what it reports.
