---
title: Overview
order: 0
slug: index
category: Renderers
categoryOrder: 3
---
# Renderers

Renderers are JS or TS functions of type [`Renderer`]({{url-to="yassb.html#renderer"}}) that elaborate a given data source and produce the HTML.

Renderers are invoked by directives. When invoking a renderer directives normally pass to them the data they need to produce the desired HTML.

For example, the built-in directives [`create-from-data-source`]({{url-to="create-from-data-source-directive"}}) and [`public-file-list`]({{url-to="public-file-list-directive"}}) use renderers to generate the HTML to inject into pages.

YASSB comes with two built-in renderers:

- [`basicElement`]({{url-to="basicElementRenderer"}}); and
- [`liDateDescription`]({{url-to="liDateDescriptionRenderer"}}).

These are very simple renderers and you will probably want to define [custom renderers]({{url-to="custom-renderers"}}) to generate the DOM elements that best fit your needs.