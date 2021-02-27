[![npm version](https://badge.fury.io/js/yassb-web.svg)](https://www.npmjs.com/package/yassb-web)
[![Node version](https://img.shields.io/node/v/yassb-web.svg)](https://www.npmjs.com/package/yassb-web)
[![Node version](https://img.shields.io/npm/l/yassb-web)](https://www.npmjs.com/package/yassb-web)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/ba8104457f424974b286a998bea7e9a8)](https://www.codacy.com/gh/YASSB-FOSS/yassb/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=YASSB-FOSS/yassb&amp;utm_campaign=Badge_Grade)

# YASSB (*Yet Another Static Site Builder*)

YASSB is a static website builder. It processes HTML, SCSS, JavaScript/TypeScript, JSX/TSX, JSON, MarkDown (with optional Front Matter data) and many more files of your choice and combines them in beautiful static HTML files.

YASSB is built with TypeScript, and is shipped, with all its definitions, in JavaScript as a Universal Module (`umd`), so it runs "natively" in node. It can be easily extended with TypeScript/Javascript functions to tailor it to your needs.

## Core features

YASSB is simple, yet powerful, it supports:

  - composition of web pages by injecting HTML components (e.g. injection of `<header> ... </header>` defined in `components/header.html`);
  - rendering of multiple or single HTML pages from MarkDown and Text files, with support of Front Matter, as seen in Hugo, Jekyll and others.
  - generation at compilation time of dynamically defined components via built-in or custom directives and renderers;
  - `renderers` defined in vanilla JS/TS, or JSX/TSX (for example with [`renderToStaticMarkup`](https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup) from [`react-dom/server`](https://reactjs.org/docs/react-dom-server.html));
  - i18n and localization (multi-language sites).

## Demo, guides and docs

Keep reading below for a quick tour on how to get started and the basics on how to use YASSB.

For a complete description and technical details on what YASSB can do for you, check out:

  - a working [Demo](https://yassb-foss.github.io/) of the landing page for this project, built with YASSB!
  - the [guides](https://yassb-foss.github.io/guides/) with many explanations and examples of what you can do with YASSB;
  - the complete [docs](https://yassb-foss.github.io/docs/) with the technical details of how YASSB works under the hood.


## Installation

    npm i -g yassb-web
or

    yarn global add yassb-web

## Create a new project

    yassb new myStaticWebSite

and

    cd myStaticWebSite

## Build the project into a static web site

    yassb build
or

    yassb watch // w/ live reloading!

### `build`: production-ready build of the website

YASSB generates the full website with compressed `html` and minified `js` and `css`. All additional static assets are also copied to the `out` folder.

For the options that can be passed to YASSB see [configuration](https://yassb-foss.github.io/guides/setup/configuration.html).

### `watch`: website development

YASSB builds all the files in your project and watches for any changes. On each change, YASSB recompiles the project. To save time, only assets that need to be recompiled are processed.

While in watch mode, the processed website is served on `http://localhost:[PORT]`. By default port `3000` is used, unless a custom value is provided under `devServerPort` in the [configuration](https://yassb-foss.github.io/guides/setup/configuration.html).

For the full list of options that can be passed to YASSB see the [configuration](https://yassb-foss.github.io/guides/setup/configuration.html).

### Serving on localhost

The `serve` command is also available to serve the website locally without recompiling it:

    yassb serve

This will launch the server on `http://localhost:[PORT]`. By default port `3000` is used, unless a custom value is provided under `devServerPort` in the [configuration](https://yassb-foss.github.io/guides/setup/configuration.html).

Please note that the server is very limited and should not be used as-is in production.

## Project structure

A YASSB project in it's simplest form is just HTML pages. Plain and simple. 

More complex sites can be composed, alongside with HTML files, also with many more file formats, including MarkDown and JSON. Additionally, `custom directives` and `custom renderers` can be used to automatically generate and populate your files.

A typical YASSB project is organized in different folders and subfolders. The predefined structure of a project can be fully personalised when [configuring YASSB](https://yassb-foss.github.io/guides/setup/configuration.html).

## How web pages are generated

The starting point for building a website with YASSB is to add a `index.html` file in `pages`. If you created your project with `yassb new [projectname]` a simple template is already there as an example.

Because YASSB works with `HTML` files, any page you put in your `pages` is already a valid `HTML` file that you can serve statically from any web server.

Each `html` file in this folder will become a page on your website. In this folder you should put the index file of your website (`index.html`), and any other individual page you might want to have on your website (e.g. `about.html`, `contact.html`, `products/awesome-thing.html`, etc.).

To reuse the same HTML code across multiple pages, you can put HTML snippets in dedicated HTML files in `components` (e.g. `header.component.html`). These are injected into pages at compilation time by the [`component` directive](https://yassb-foss.github.io/guides/directives/component-directive.html).

If you have lists of things, instead of manually typing them, you can generate the lists with the [`create-from-data-source` directive](https://yassb-foss.github.io/guides/directives/create-from-data-source-directive.html). The data source JSON files must placed in the folder `data-sources`. [Custom renderes](https://yassb-foss.github.io/guides/renderers/custom-renderers.html) (JS/TS/JSX/TSX functions) can be provided to generate any kind of list/layout.

If you have some text that you'd like to write in MarkDown (e.g. blog posts), you'll place the template for the pages to be generated in `pages-to-generate`. For each .md file provided (from anywhere on your disk), the [`generate-from-files` directive](https://yassb-foss.github.io/guides/directives/generate-from-files-directive.html) will create a new HTML file with the content of the .md file processed as html.

Because generating files might create a lot of fles, you will probably want to create custom indexes. To do so, you will only need to add to any HTML file the [`public-file-list` directive](https://yassb-foss.github.io/guides/directives/custom-directives.html) to specify the path for which you want to create a list of file found at such path. [Custom renderes](https://yassb-foss.github.io/guides/renderers/custom-renderers.html) (JS/TS/JSX/TSX functions) can be provided to generate any kind of layout.

## Development

Contributions in the form of PR and issues are encouraged, and if you'd like to get involved you are also welcome to become a mainainer.

To get started `fork` and `git clone` this repository.

Then run

    yarn install

If you are using Visual Studio Code, you are pretty much ready to start editing the source code.

ESLint will take care of signaling any formatting you should be aware of, except code indentation. For varous reasons, as of now, there's not an ESLint rule to enforce the indentation style in this project. Please use __2 white spaces__ for indentation.

Once you are ready, you can build the JS bundle by running the following commnad in the console:

    npm run build-yassb

This will generate a new bundle in the `bundle` dir.

You can now even try the freshly made bundle by processing the landing page for this project.

Run: 

    npm run build-landing

Then run

    npm run serve

And visit che localhost at port 3000.

Happy coding!

## I need more info

Check out:

  - a working [Demo](https://yassb-foss.github.io/) of the landing page for this project, built with YASSB!
  - the [guides](https://yassb-foss.github.io/guides/) with many explanations and examples of what you can do with YASSB;
  - the complete [docs](https://yassb-foss.github.io/docs/) with the technical details of how YASSB works under the hood.
