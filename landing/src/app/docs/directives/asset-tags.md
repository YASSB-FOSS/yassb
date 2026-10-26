---
title: Asset tags
description: Insert the tags of the compiled stylesheet and script with their versioned names.
section: Directives
sectionOrder: 3
order: 4
slug: asset-tags
---

<!-- feature: directive.include-styles-src, directive.include-script-src -->

<p class="lead">The compiled CSS and JavaScript have the site version in their names. Two directives insert the right tags.</p>

```html
<head>
  <!-- include-styles-src -->
</head>
<body>
  …
  <!-- include-script-src -->
</body>
```

becomes, for a site at version `1.2.0`:

```html
<link rel="stylesheet" href="/assets/css/styles-1-2-0.min.css">
<script src="/assets/js/main-1-2-0.min.js"></script>
```

The text must be exactly `<!-- include-styles-src -->` and `<!-- include-script-src -->`. The URLs follow `workingDir.styles`, `workingDir.scripts`, `stylesOutFolder`, `scriptsOutFolder` and the `version` of your `package.json`: bump the version and every page points to the new files, so browsers never use a stale cache.

See [Styles and scripts](/docs/configuration/styles-and-scripts.html) for how the files are produced.
