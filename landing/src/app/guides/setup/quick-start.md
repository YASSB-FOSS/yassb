---
title: Quick start
order: 0
slug: index
category: Setup
categoryOrder: 1
---
# Quick start
## Installation

<!-- component="instructions/installation.md" -->

## Create a new project

<!-- component="instructions/new-project.md" -->

## Build the project into a static web site

<!-- component="instructions/builds.md" -->

### `build`: production-ready build of the website

YASSB generates the full website with compressed `html` and minified `js` and `css`. All additional static assets are also copied to the `out` folder.

For the options that can be passed to YASSB see [configuration]({{url-to="configuration"}}).

### `watch`: website development

YASSB builds all the files in your project and watches for any changes. On each change, YASSB recompiles the project. To save time, only assets that need to be recompiled are processed.

While in watch mode, the processed website is served on `http://localhost:[PORT]`. By default port `3000` is used, unless a custom value is provided under `devServerPort` in the [configuration]({{url-to="configuration"}}).

For the full list of options that can be passed to YASSB see the [configuration]({{url-to="configuration"}}).

### Serving on localhost

The `serve` command is also available to serve the website locally without recompiling it:

    yassb serve

This will launch the server on `http://localhost:[PORT]`. By default port `3000` is used, unless a custom value is provided under `devServerPort` in the [configuration]({{url-to="configuration"}}).

Please note that the server is very limited and should not be used as-is in production.