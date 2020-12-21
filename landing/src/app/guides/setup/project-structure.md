---
title: Project structure
order: 1
category: Setup
categoryOrder: 1
---
# Project structure

A YASSB project in it's simplest form is just HTML pages. Plain and simple. 

More complex sites can be composed, alongside with HTML files, also with many more file formats, including MarkDown and JSON. Additionally, `custom directives` and `custom renderers` can be used to automatically generate and populate your files.

A typical YASSB project is organized in different folders. The following structure is encouraged, but all folder/file names can be personalised in the [configuration]({{url-to="configuration"}}):

|Default name|Child of|Description
|----|--------|-------------
| ./ | [n/a] | Root folder
| src|./ | Contains the whole YASSB project
| assets|./src/ | Website assets. It's cloned in `out`. Scripts and Styles are also placed here
| i18n|./src/ | Contains the localization files ([lang].json) with translation strings
| app|./src/ | Contains all the files processed by YASSB
| pages|./src/app/ | HTML pages of the web site (excluded those to be generated automatically)
| components|./src/app/ | Contains HTML files with fragments to be injected into pages (e.g. `footer`)
| data-sources|./src/app/ | Contains the JSON files with the data to generate iterable items
| pages-to-generate|./src/app/ | HTML templates to be used when creating pages from .md files
| scripts/main.ts|./src/app/ | Entry file to be processd by webpack. Can end with: `.js` | `.ts`
| styles/style.scss|./src/app/ | Entry file to be processd by node-sass. Can end with: `.css` | `.scss`
| out|./ | Destination dir of the compiled project - defaults to `dist/public`
| js|./out/assets/ | Destination dir of minified JS file, retains the same name of the entry file + version + min.js
| css|./out/assets/ | Destination di of minified css file, retains the same name of the entry file + version + min.css

## Custom project structure

You can change the project structure and the folder names in the [configuration]({{url-to="configuration"}}). 

At run time, all folders are resolved relative to the folder of which they are a `child of` in the predefined project structure. For example, the folder `components` is resolved relative to the folder `./src/app`.

So if you rename in the configuration the `components` folder to something else, for example `fragments`, the final folder will be resolved to `./src/app/fragments`.

Example:

    // config/default.js
    
    module.exports {
      workingDir: {
        components: 'fragments'
      }
    }

    // result ./src/app/fragments

Because folders are resolved as relative paths, you can alter the structure of the project when setting custom folder names. For example, if you want the `fragments` folder to be a child of the `./src` folder, instead of the `./src/app` folder, you can do the following:


    // config/default.js

    module.exports {
      workingDir: {
        components: '../fragments'
      }
    }

    // result ./src/fragments

In this way you can even reference folders that are outside of the `root folder` of the project, for example by passing `../../../../shared-code/components`.

This can be very handy to reuse the same folder in multiple projects (for example the `components` folder), or to store your source files (MarkDown, JSON, etc.) anywhere on your disk.

## How web pages are generated

The starting point for building a website with YASSB is to add a `index.html` file in `pages`.

Because YASSB works with `HTML` files, any page you put in your `pages` is already a valid `HTML` file that you can serve statically from any web server.

Each `html` file in this folder will become a page on your website. In this folder you should put the index file of your website (`index.html`), and any other individual page you might want to have on your website (e.g. `about.html`, `contact.html`, `products/awesome-thing.html`, etc.).

To reuse the same HTML code across multiple pages, you can put HTML snippets in dedicated HTML files in `components` (e.g. `header.component.html`). These are injected into pages at compilation time by the [`component` directive]({{url-to="component-directive"}}).

If you have lists of things, instead of manually typing them, you can generate the lists with the [`create-from-data-source` directive]({{url-to="create-from-data-source-directive"}}). The data source JSON files must placed in the folder `data-sources`. [Custom renderes]({{url-to="custom-renderers"}}) (JS/TS/JSX/TSX functions) can be provided to generate any kind of list/layout.

If you have some text that you'd like to write in MarkDown (e.g. blog posts), you'll place the template for the pages to be generated in `pages-to-generate`. For each .md file provided (from anywhere on your disk), the [`generate-from-files` directive]({{url-to="generate-from-files-directive"}}) will create a new HTML file with the content of the .md file processed as html.

Because generating files might create a lot of fles, you will probably want to create custom indexes. To do so, you will only need to add to any HTML file the [`public-file-list` directive](XXX) to specify the path for which you want to create a list of file found at such path. [Custom renderes]({{url-to="custom-renderers"}}) (JS/TS/JSX/TSX functions) can be provided to generate any kind of layout.