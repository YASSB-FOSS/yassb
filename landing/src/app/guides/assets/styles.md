---
title: Styles
order: 2
category: Assets
---
# Styles

Styles processing and bundling is currently provided out-of-the-box with [dart-sass](https://sass-lang.com/dart-sass). You can also entirely overwrite the built-in process and bring you own styles processor in YASSB [configuration]({{url-to="configuration"}}).

By default, YASSB processes `./src/app/styles/styles.scss` and saves the final file in `./out/assets/css/[name]-[version].min.js`.

The value for `[version]` is retrieved from `package.json`. Note that you don't have to manually insert the link to the stylesheet in your pages. You can insert it automatically with the `include-styles-src` [directive]({{url-to="includeStylesSrc"}}).

The input file and the output folder can be customized in the [configuration]({{url-to="configuration"}}). You can customize both or only one of them.

Example of a custom definition of the input file and of the destination folder in `config/default.ts`:

    export default {
      workingDir: {
        styles: 'custom-dir/styles.scss', // It must be a relative path to the `app` folder
        stylesOutFolder: 'my-styles' // relative path to the `out` folder
      }
    } as YassbConfig

In this example the entry point for WebPack will be `./src/app/custom-dir/styles.scss` and the destination folder `out/my-styles`.

### Example using Bootstrap

Building your own Bootsrap minified stylesheet is very simple. 

You simply need to import in your `styles.scss` the stylesheets you need from Bootstrap:

    // src/app/styles/styles.scss or any other custom file defined in configuration

    @charset 'UTF-8';

    // Bootstrap & Variables
    @import "../../../node_modules/bootstrap/scss/functions";
    @import "../../../node_modules/bootstrap/scss/variables";
    @import "../../../node_modules/bootstrap/scss/variables";
    @import "../../../node_modules/bootstrap/scss/mixins";
    @import "../../../node_modules/bootstrap/scss/tooltip";
    @import "../../../node_modules/bootstrap/scss/popover";
    @import "../../../node_modules/bootstrap/scss/carousel";
    @import "../../../node_modules/bootstrap/scss/spinners";
    @import "../../../node_modules/bootstrap/scss/utilities";
    ...

YASSB will automatically process all styles and place them in a versioned an minified `css` file in the `stylesOutFolder` folder.

## Custom Styles Parsers

You can alternatively define a custom style processor in YASSB [configuration]({{url-to="configuration"}}).

A custom style parsers is a JavaScript or TypeScript function of type [`CustomStylesParser`]({{url-to="yassb.html#customstylesparser"}}) that returns the full `css`, synchronously or as a Promise: 

    (
      absolutePathToFile: string,
      relativePathToOrigin: string, 
      relativePathToDestination: string
    ) => Promise<string | Buffer> | string | Buffer;

Where:
- `absolutePathToFile` is the full path to the source style.
- `relativePathToOrigin` is the path to the styles relative to the root folder of the project.
- `relativePathToDestination` is the output folder, relative to the root folder of the project.

Custom parsers do not need to save to disk the parsed css. YASSB will take care of that.

### Example using TailwindCSS

To use a custom styles parser we first need to define it. 

The file where we define the custom parser can be located anywhere in the project:

    // src/app/plugins/my-custom-styles-parser-for-tailwind-css.ts

    import autoprefixer from 'autoprefixer';
    import { readFileSync } from 'fs';
    import postcss from 'postcss';
    import tailwindcss from 'tailwindcss';

    export const myCustomStylesParserForTailwindCSS =
     async (pathToCssFile, from, to): Promise<string> => {
        const css = readFileSync(pathToCssFile)
        const result = await postcss([tailwindcss, autoprefixer])
                            .process(css, { from, to, map: false });
        return result.css;
      }

Then we simply need to add it to our [configuration]({{url-to="configuration"}}) in `config/default.ts`:

    export default {
      stylesParser: myCustomStylesParserForTailwindCSS
    } as YassbConfig

That's it. YASSB will now use our custom parser during styles processing!