---
title: component directive
order: 1
category: Directives
categoryOrder: 2
---
# `component` directive

The most basic YASSB directive is the `component` directive.

    <!-- component="[path-to-a-file]" -->

YASSB will analize the value passed as `[path-to-a-file]` and will replace the line where the directive was found in the file being processed with the contents of that file.

The path can be
- absolute: anywhere on disk where YASSB can read files;
- relative: in this case it will be resolved as a child dir of the `components` folder of you project. 

Supported file formats are: `.html`, `.htm`, `.txt`, `.svg`, `.md`.

Example:

    <html>
      <!-- component="head.html" -->"
    <body>
      <!-- component="header.html" -->"
      <div>
        Hello World
      </div>
      <!-- component="footer.html" -->"
    </body>

The file `header.html` in `components` might look like this:

    <header>
      <!-- component="image-components/logo.svg" -->      // You can create subfolders in `components`
      <a href="/">Home</a>
      <a href="/about.html">About</a>
    </header>

Note how the image `logo.svg` is a YASSB directive. Because YASSB directives are recoursive, YASSB will inject the content of the svg image (or anything the directive points to) into the final rendered page. So every page where we inject the header will also have the logo. This works for infinite levels of recursion, so you can nest how many files as you need.

The string for `[path-to-a-file]` can contain the wildcard `LANG` at any point in the string. In that case YASSB will replace `LANG` with the language code (e.g. `en`, see [Internationalization (i18n)]({{url-to="internationalization"}}). So, for a website supporting both `en` and `es`, `components/LANG/footer.html` will inject the component, respectively, found in `components/en/footer.html` and `components/es/footer.html`.
