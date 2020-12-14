---
title: liDateDescription renderer
order: 2
category: Renderers
---
# `liDateDescription` renderer

Creates an HTML list where the first element is a date and the second element is some text.

The date can be displayed as is, or it can be formatted by YASSB. When formatted by YASSB, the locale of the language being generated is used, otherwise when i18n is not enabled, `en` is used as a default.

The `source` must be an Array of elements formatted as follows:

Without i18n:

    { 
      "date": {
        "raw": "[string],
        "start": "[YYYY/MM/DD | YYYY/MM | YYYY]",
        "end": "[YYYY/MM/DD | YYYY/MM | YYYY | '-' ]"
      },
      "description": "" 
    }

`raw` is required if `start` is not provided

`start` is required if `raw` is not provided. The date will be formatted based on the information provided (year only, year and month, year, month and day)

`end` is optional. If the character `-` is passed, it will be converted to the text "present".

With i18n:

    {
      "date": {
       ... same as without i18n
      },
      "description": {
        [lang: string]: ""
      }
    }