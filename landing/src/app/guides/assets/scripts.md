---
title: Scripts
order: 1
category: Assets
---
# Scripts

Scripts processing and bundling is provided out-of-the-box with [WebPack](https://webpack.js.org/).

YASSB comes with a predefined configuration for WebPack. You can override it and provide your own in the [configuration](/guides/setup/configuration).

By default, YASSB processes `./src/app/scripts/main.ts` and saves the final file in `./out/assets/js/[name]-[version].min.js`.

The value for `[version]` is retrieved from `package.json`. Note that you don't have to manually insert the link to the script in your pages. You can insert it automatically with the `include-script-src` [directive](/guides/directives/includescriptsrc-directive.html).

The input file and the output folder can be customized in the [configuration](/guides/setup/configuration.html). You can customize both or only one of them.

Example of a custom definition of the input file and of the destination folder in `config/default.ts`:

    export default {
      workingDir: {
        scripts: 'custom-dir/scripts.js', // It must be a relative path to the `app` folder
        scriptsOutFolder: 'scripts' // relative path to the `out` folder

      }
    } as YassbConfig

In this example the entry point for WebPack will be `./src/app/custom-dir/scripts.js` and the destination folder `out/scripts`.

Note how in the example above the entry point is a `JavaScript` file. With the default WebPack configuration you can either provide a TypeScript or JavaScript entry point, including JSX and TSX files.

## Custom WebPack configuration

You can define a custom WebPack configuration. You can do so in YASSB [configuration](/guides/setup/configuration.html).

Example custom configuration of WebPack in `config/default.ts`:

    export default {
      webpackConfig: {
        entry: {
          file: 'your-entry-point.ts'
        },
        resolve: {
          extensions: ['.ts', 'tsx', '.js', 'jsx']
        },
        target: 'web',
        node: {
          __dirname: true
        },
        output: {
          path: 'your-out-dir/[name].js',
          filename
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              loader: 'ts-loader'
            },
            {
              test: /\.js$/,
              loader: 'awesome-typescript-loader'
            }
          ]
        },
        mode: 'development'
      }
    } as YassbConfig
