---
title: Overview
order: 0
slug: index
category: Directives
categoryOrder: 2
---
# Directives Overview

The power of YASSB is to compose your pages by injecting content at compilation time. 

In this way the same code can be reused across multiple pages and HTML can be programmatically generated.

YASSB injects content based on the directive it finds in each file it processes. 

By convention, YASSB directives have two alternative structures. 

## Directives inside HTML comments

The most common way to invoke a directive is to do so inside an HTML comment: 

    <!-- [yassbDirective]="[value]" ...[ [attibute-name]="[value]" ] -->

Note how this is a standard `HTML` comment. So YASSB directives can be placed in any HTML, MarkDown, or other text file without breaking HTML synthax.

## Directives inside curly brackets

Alternatively, directives can also be placed inside two sets of curly brackets:

    {{[yassbDirective]="[value]" ...[ [attibute-name]="[value]" ]}}

This is the preferred way of invoking directives that must be placed inside HTML attributes, such as the [`url-to` directive]({{url-to="urlToDirective"}})
    
## How Directives work

YASSB directives are analyzed at compilation time, and are removed in the final `HTML` file. 

YASSB analyzes directives recursively, so you can put a directive inside an element that has been injected by a directive, and so on. But be aware of infinite loops!

Note that you can place directives in any kind of file. You are not limited to HTML files. So, for example, you can place a directive in a MarkDown file, to inject in it the contents of another MarkDown file, which could contain another directive to inject, for example, the SVG code of an image. All these directives will be analyzed and injected in the final HTML code of the page to be composed.

Please note that when providing paths to YASSB you should always use __forward slashes only__ (`/`), never backslashes (`\`).