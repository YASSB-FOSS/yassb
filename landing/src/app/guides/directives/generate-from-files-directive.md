---
title: generateFromFiles directive
order: 3
category: Directives
categoryOrder: 2
---
# `generate-from-files` directive

Used to generate new HTML pages based on an HTML template, for the page structure, and MarkDown/TXT files, for the contents.

The templates must be placed in `pages-to-generate`, e.g.:

    src/app/pages-to-generate/blog/basic-post.template.html

Templates can contain only one `generate-from-files` directive, but they can also contain any number of any other directive. The `generate-from-files` directive should be placed where the contents of the MarkDown file, parsed as HTML, should be placed. 

Example:

    <html>
      <!-- component="head.html" -->"
    <body>
      <!-- component="header.html" -->"
      <article>
        <!-- generate-from-files="C:/my-posts/" -->
        // OR
        <!-- generate-from-files="my-posts" --> // resolve to `app/my-posts`
      </article>
      <!-- component="footer.html" -->"
    </body>

The path passed to `generate-from-files` can be
- absolute: anywhere on disk where YASSB can read files; 
- relative: in this case it will be resolved as a child dir of the `app` folder of you project.

For each `.md` file found in the destination folder, a new HTML page will be created with the contents of the `.md | .txt` file. The folder is analysed recourively.

The generated HTML files will be placed in `out` resolving the relative path both of the template and of the `.md | .txt` file:
- for the template, the path is relative to the `pages-to-generate` dir. So for `src/app/pages-to-generate/blog/basic-post.template.html` the relative path is `blog`;
- for the template, the path is relative to the path passed to the directive dir. So if under `C:/my-posts/` there is a folder `2020` and a file `hello-world.md` (full path `C:/my-posts/2020/hello-world.md`), the relative path is `2020`;

In this example, the generated file will be `/blog/2020/hello-world.html`.