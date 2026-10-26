---
title: Configuration
order: 2
category: Setup
categoryOrder: 1
---
# Configuration

YASSB can be run as it is, or it can be fine tuned to your needs.

YASSB reads the `config` folder with the same rules as the [`config`](https://www.npmjs.com/package/config) package: `default.ts` (or `.js`, `.json`), then files for the environment (`production.ts` when `NODE_ENV=production`), the instance (`default-2.ts` when `NODE_APP_INSTANCE=2`) and `local.ts`, merged in this order.

## Available options

To edit available options, first create a new `config` folder in your root project folder.

Inside `config` create a new `default.js` file. This file should export one object of type [`YassbConfig`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts).

Available options that can be set as properties of the [`YassbConfig`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts) object are available as a valueof the `enum` [`OptionsKeys`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts).

The available options are the following: 

| Option   | Value | Default | Description |
|----------|-------|---------|-------------|
|`username`|[`string`]|`undefined`|value to replace the wildcard `USERNAME` to anonymise values passed to directives
|`customRenderers`|[[`RenderersStore`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts)]|`[]`|used to pass to YASSB your [custom renderers]({{url-to="custom-renderers"}});
|`customDirectives`| [[`CustomDirectivesStore`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts)]|`[]`|used to pass to YASSB your [custom directives]({{url-to="directives/customDirectives"}});
|`workingDir`|[`Partial<typeof` [`WORKING_DIR`](https://github.com/YASSB-FOSS/yassb/blob/master/src/yassb.ts)`>`]|see [Project structure]({{url-to="Project-structure"}})|object to customize the folder names used by the project
|`skipsStyles`|[`boolean`]|`false`|whether YASSB should skip parsing styles.
|`stylesParser`|[`CustomStylesParser`]|`undefined`| see [custom-styles-parsers]({{url-to="assets/styles#customstylesparsers"}})
|`postProcessors`|[`Array<(fileContents: string) => string>`]|`[]`| see [post processors]({{url-to="post-processors"}})
|`htmlMinificationOptions`|[`HtmlMinifierOptions`]|`{}`|see available options at [html-minifier-terser](https://www.npmjs.com/package/html-minifier-terser)
|`showdownConverterOptions`|[`ConverterOptions`]|`{tables: true}`| see available options at [showdown](https://www.npmjs.com/package/showdown)
|`grayMatterOption`|[`GrayMatterOption<string, unknown>`]|`{}`| see available options at [gray-matter](https://www.npmjs.com/package/gray-matter)
|`esbuildOptions`|[`object`]|`undefined`|extra [esbuild options](https://esbuild.github.io/api/#build) for the scripts
|`webpackConfig`|[`object`]|`undefined`|legacy: bundle the scripts with webpack (installed in your site)
|`siteHost`|[`string`]|`undefined`|Base URL of the website to [enable the sitemap]({{url-to="setup/sitemap"}}).
|`devServerPort`|[`number`]|`3000`|The `port` on which to open the dev server launched in `watch` mode.
|`sitemap`|[`boolean`]|`true`|`false` to never write `sitemap.xml` (`url-to` keeps working).
|`cleanOut`|[`boolean`]|`false`|empty the output folder (dot files are kept) before each build.
|`strict`|[`boolean`]|`false`|any reported error fails the build (exit code 1).
|`i18n`|[`{ allowHtml?: boolean }`]|`{}`|`allowHtml: true` inserts translations as HTML.
|`beforeBuild`|[`(info) => void`]|`undefined`|hook called before every build, in `build` and `watch`.
|`afterBuild`|[`(result) => void`]|`undefined`|hook called after every build, in `build` and `watch`, with the diagnostics.

Example:

    module.exports {
      username: 'alex',
      workingDir: {
        src: 'landing',
        out: 'public'
      }
    }

## TypeScript support

Alternatively, you can provide the configuration file in TypeScript.

To do so, rename the config file to `default.ts`. YASSB compiles it (and the renderers and directives it imports, including `.tsx`) with esbuild, using your `tsconfig.json`; `typescript` is not needed. `defineConfig` gives you type checking in the editor:

    import { defineConfig } from 'yassb-web';

    export default defineConfig({
      siteHost: 'https://example.com'
    });

In this case `defaul.ts` should look like this:

    export default {
      username: ...
      ...
    };