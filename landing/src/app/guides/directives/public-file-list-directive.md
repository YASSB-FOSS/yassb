---
title: publicFileList directive
order: 4
category: Directives
categoryOrder: 2
---
# `public-file-list` directive

Generates a list of the files found at a given path in the `out` dir. Useful for example for creating indexes or lists of files generated automatically by [`generate-from-files` directive]({{url-to="generate-from-files-directive"}}).

The `public-file-list` directive expects two arguments:

    <!-- public-file-list="[publicPathToScan]" renderer="JsFunctionToElaborateTheList" -->

- `publicPathToScan [required: string]`: a path in the `out` dir. Note that only files in the subfolders will be scanned, but not immediate childs of the provided folder. So for `/blog`, only files under, for example, `/blog/2020` will be scanned, while `blog/index.html` will not be scanned.
- `renderer [required: string]` name of the function passed as a value of `customRenderers` in the options. If no renderer is provided nothing will be done. To the renderer is passed a Object of type `FilePathsForPublicFileList`, wich contains the current `lang` and as `source` an Array of `{ absolutePath: string; absoluteUrl: string }` for each file, where:

- `absolutePath` is the path to the file on disk
- `absoluteUrl` is the full url to the page, to be used for example as `href` in a link
