---
title: Custom renderers
order: 3
category: Renderers
---
# Custom renderers

Custom renderers are functions that elaborate a given data source and produce the HTML. 

Because YASSB supports both JS and TS, your functions can be in either language. 

Custom renderers should be of type [`Renderer`]({{url-to="yassb.html#renderer"}}) should expect one argument, which is an object with the following properties:

- `currentFilePath`: the full path of the file benig processed. This will be a subdirectory of the `out` folder;
- `source`: an Array of elements as defined in the directive (e.g. the content of the JSON file to which the directive points to);
- `config`: the full configuration object;
- `options`: the options passed in the directive via `options="..."`;
- `frontMatterStore`: the full Front Matter data store, see [Front Matter]({{url-to="FrontMatter"options="{"waring":false}"}});
- `lang`: if i18n is enabled, the code of the current language (e.g. `en`).

## Adding custom renderers

You can set custom renderers by adding them to the `Array` passed to the property `customRenderers` in the [configuration]({{url-to="configuration"}}).

Example:
    
    // config/default.js

    module.exports {
      customRenderers: [myCustomRenderer]
    }

## Rendering HTML in JSX/TSX files with `renderToStaticMarkup`

Additionally you can provide JSX or TSX renderers, provided that they do return valid HTML code. The preferred method to do so would be to render the elements with [`renderToStaticMarkup`](https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup) from [`react-dom/server`](https://reactjs.org/docs/react-dom-server.html).

Example of a renderer in TSX to produce a list of links to be used with the [`public-file-list` directive]({{url-to="public-file-list-directive"}}):

    import { 
      FilePathsForPublicFileList, 
      Renderer, 
      RendererProps 
    } from '@yassb/yassb';
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';

    function getTitleFromContent(absolutePath: string): string { 
      // Because Front Matter data, is set, is available in each HTML file,
      // the title could be retrieved from there. Or any other logic.
    }

    export const exampleWithReact: Renderer = 
      ({ source, lang, options }: RendererProps<Array<FilePathsForPublicFileList>>): string => {
        const li = [];
        source.forEach(filePaths => {
          const fileTitle = getTitleFromContent(filePaths.absolutePath);
          const attr = { href: filePaths.absoluteUrl };
          li.push(<li><a {...attr}>{fileTitle}!</a></li>);
        });
        return renderToStaticMarkup(<ul></ul>);
      }

If you want to use TypeScript, JSX or TSX, remember to add all the neded dependencies in `package.json` of your project.
