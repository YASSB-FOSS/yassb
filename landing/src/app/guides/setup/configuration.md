---
title: Configuration
order: 2
category: Setup
categoryOrder: 1
---
# Configuration

YASSB can be run as it is, or it can be fine tuned to your needs.

YASSB configuration is based on [`config`](https://www.npmjs.com/package/config). Below are described the specific configuration options of YASSB. To learn more about `config` and the many options it supports see [config's npm page](https://www.npmjs.com/package/config).

## Available options

To edit available options, first create a new `config` folder in your root project folder.

Inside `config` create a new `default.js` file. This file should export one object of type [`YassbConfig`]({{url-to="YassbConfig"}}).

Available options that can be set as properties of the [`YassbConfig`]({{url-to="YassbConfig"}}) object are available as a valueof the `enum` [`OptionsKeys`]({{url-to="OptionsKeys"}}).

The available options are the following: 

| Option   | Value | Default | Description |
|----------|-------|---------|-------------|
|`username`|[`string`]|`undefined`|value to replace the wildcard `USERNAME` to anonymise values passed to directives
|`customRenderers`|[[`RenderersStore`]({{url-to="RenderersStore"}})]|`[]`|used to pass to YASSB your [custom renderers]({{url-to="custom-renderers"}});
|`customDirectives`| [[`CustomDirectivesStore`]({{url-to="yassb.html#customdirectivesstore"}})]|`[]`|used to pass to YASSB your [custom directives]({{url-to="directives/customDirectives"}});
|`workingDir`|[`Partial<typeof` [`WORKING_DIR`]({{url-to="modules/config.html#working_dir"}})`>`]|see [Project structure]({{url-to="Project-structure"}})|object to customize the folder names used by the project
|`skipsStyles`|[`boolean`]|`false`|whether YASSB should skip parsing styles.
|`stylesParser`|[`CustomStylesParser`]|`undefined`| see [custom-styles-parsers]({{url-to="assets/styles#customstylesparsers"}})
|`postProcessors`|[`Array<(fileContents: string) => string>`]|`[]`| see [post processors]({{url-to="post-processors"}})
|`htmlMinificationOptions`|[`MinifyOptions`]|`{}`|see available options at [html-minifier](https://www.npmjs.com/package/html-minifier)
|`showdownConverterOptions`|[`ConverterOptions`]|`{tables: true}`| see available options at [showdown](https://www.npmjs.com/package/showdown)
|`grayMatterOption`|[`GrayMatterOption<string, unknown>`]|`{}`| see available options at [gray-matter](https://www.npmjs.com/package/gray-matter)
|`webpackConfig`|[`Configuration`]|see [the default configuration]({{url-to="assets/scripts#defaultwebpackconfiguration"}})| see the configuration options at [WebPack.js.org](https://webpack.js.org/)
|`siteHost`|[`string`]|`undefined`|Base URL of the website to [enable the sitemap]({{url-to="setup/sitemap"}}).
|`devServerPort`|[`number`]|`undefined`|The `port` on which to open the dev server launched in `watch` mode.

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

To do so, rename the config file to `default.ts`. In this case please note that `typescript` __must__ be a dependency of your project.

In this case `defaul.ts` should look like this:

    export default {
      username: ...
      ...
    };