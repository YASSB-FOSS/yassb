---
title: basicElement renderer
order: 1
category: Renderers
---
# `basicElement` renderer

Creates a simple HTML list (`<ul><li> ... </li> ... </ul>`).

The `source` must be an Array of elements formatted as follows:

Without i18n:

    { "description": "" }

With i18n:

    {
      "description": {
        [lang: string]: ""
      }
    }

The type of DOM element to be created can optionally be passed via the `options` attribute in the directive (defaults to `{ "tag": "span" }`).

Example to create a simple list:

    // in data-source.json
    [
      { "description": "First" },
      { "description": "Second" }
    ]

    // in any HTML file
    <ul>
      <!-- create-from-data-source="[path-to-data-source].json" options="{ "tag": "li" }" -->
    </ul>

    // Result
    <ul>
      <li>First</li>
      <li>Second</li>
    </ul>
