---
title: Custom directives
description: Add your own directives for structural needs the built-in ones cannot express.
section: Directives
sectionOrder: 3
order: 5
slug: custom-directives
---

<!-- feature: api.custom-directives, config.customDirectives -->

<p class="lead">A custom directive is a class with a regular expression and an <code>init()</code> method that returns the updated HTML. Use one for layouts or selections that span several data files.</p>

```ts
import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from 'yassb-web';

/** <!-- current-year --> → 2026 */
export class CurrentYearDirective implements YassbDirective {
  static regex = /<!--\s*current-year\s*-->/g;

  constructor(private args: YassbDirectiveProps) { }

  init(): YassbDirectiveResponse {
    const html = this.args.fileContents.replace(CurrentYearDirective.regex, String(new Date().getFullYear()));
    return { html, data: {} };
  }
}
```

```ts
export default {
  customDirectives: [CurrentYearDirective]
};
```

## What a directive receives

| Prop | Content |
|---|---|
| `fileContents` | the whole HTML, as updated by the previous directives |
| `directiveFullString` | the text matched by your regex for this call |
| `fileFullPath` | the file being processed: a component in `src`, or the page in the output |
| `lang` | the language being built |
| `config` | the configuration, with absolute folders |
| `frontMatterStore` | front matter of every page |

`init()` returns `{ html, data }`: the whole updated HTML, and values that become `{ key }`-style placeholders of the page. Extending `YassbBaseDirective` copies the props to `this.fileContents`, `this.directiveFullString`, `this.config`, `this.lang` and `this.fileFullPath`.

## Rules to rely on

- Built-in directives run first, then yours in the order of `customDirectives`.
- `init()` is called **once per match**, each time with the HTML as updated by the previous call. If the first call replaces every occurrence, the next calls see nothing to do: write directives that are safe to run more than once.
- Components are processed before the page that includes them. To act only on whole pages, check where the file is:

```ts
init(): YassbDirectiveResponse {
  const out = this.args.config.workingDir!.out as string;
  if (!this.args.fileFullPath.startsWith(out))
    return { html: this.args.fileContents, data: {} };
  // …the whole page is here
}
```

## Errors

A class without a static `regex` is skipped (`DIRECTIVE_NO_REGEX`). A directive that throws, or returns no HTML, fails the build with the file and line of the match (`DIRECTIVE_FAILED`).
