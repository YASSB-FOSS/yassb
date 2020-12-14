---
title: Overview
order: 0
slug: index
category: Internationalization (i18n)
categoryOrder: 5
---
# Internationalization (i18n)

YASSB supports multi language sites. When i18n is enabled, YASSB will create a full static version of your website in each provided language under it's own sub folder, e.g.:

    dist/
        en/
        fr/
        de/
        es/

To enable i18n for a language you only need to create a folder called `i18n` (you can customize this) placed in the root folder where your `pages` folder is located, and then place there the i18n files for each language you want to support. For a website in English and French, the following files would be added:

    i18n/
        en.json
        es.json

Each file should contain a set of keys and values identifying, respectively, the string to translate and the text to display.

For `en.json`:

    {
      "CONTACT": "Contacts"
    }

For `es.json`:

    {
      "CONTACT": "Contactos"
    }

Now YASS knows how to generate your web site in English and Spanish!

To actually tell YASS when to translate a string, you need to put one of the following attributes on the DOM element:

    data-t="[string]"
      // e.g. <h1 data-t="CONTACT"></h1>
      // result <h1>Contacts</h1>
    
    data-attr-t [attribute-name]-t="CONTACT" 
      // e.g. <meta name="description" data-attr-t content-t="CONTACT">
      // result <meta name="description" content="Contacts">