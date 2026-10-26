---
title: public-file-list
description: Render the list of files of an output folder, such as downloads or generated pages.
section: Directives
sectionOrder: 3
order: 3
slug: public-file-list
---

<!-- feature: directive.public-file-list -->

<p class="lead"><code>public-file-list</code> lists the files of a folder of the built site and passes them to a renderer. Use it for download lists, galleries, or an index of generated pages.</p>

```html
<ul class="downloads">
  <!-- public-file-list="assets/downloads" renderer="downloadList" -->
</ul>
```

```ts
import { FilePathsForPublicFileList, RendererProps } from 'yassb-web';

export function downloadList({ source }: RendererProps<Array<FilePathsForPublicFileList>>): string {
  return source
    .map(file => `<li><a href="${file.absoluteUrl}">${file.absoluteUrl.split('/').pop()}</a></li>`)
    .join('');
}
```

## Rules

- The folder is relative to the output folder and scanned recursively, in name order.
- `source` is `[{ absolutePath, absoluteUrl }]`; `sourcePath` is the scanned folder.
- The renderer must be registered in `customRenderers` (`PUBLIC_FILE_LIST_RENDERER_NOT_FOUND` otherwise).
- Only files already in the output are listed: assets (copied first), pages already processed, and every generated page.
- A folder that does not exist fails the build (`PUBLIC_FILE_LIST_NOT_FOUND`).

## An index of generated pages

Generated pages keep their front matter in `frontMatterStore`, by output path. This website builds the sidebar of these docs that way:

```ts
export function docsNav({ source, frontMatterStore, currentFilePath }: RendererProps<Array<FilePathsForPublicFileList>>): string {
  return source
    .map(file => ({ url: file.absoluteUrl, data: frontMatterStore[file.absolutePath], active: file.absolutePath === currentFilePath }))
    .filter(page => page.data?.title)
    .map(page => `<a href="${page.url}"${page.active ? ' aria-current="page"' : ''}>${page.data.title}</a>`)
    .join('');
}
```

> **Note** To know the current page, write the directive in the page or template itself, not in a component: components are processed with their own path.
