---
title: Scripts
order: 1
category: Assets
---
# Scripts

Scripts are bundled out of the box with [esbuild](https://esbuild.github.io/): TypeScript, JavaScript, JSX and TSX, with the imports of your `node_modules`.

By default, YASSB processes `./src/app/scripts/main.ts` and saves the final file in `./out/assets/js/[name]-[version].min.js` (minified, `process.env.NODE_ENV` set to `"production"`, the JSX settings of your `tsconfig.json`). In `watch` mode the file is not minified and has an inline source map.

The value for `[version]` is retrieved from `package.json`. Note that you don't have to manually insert the link to the script in your pages. You can insert it automatically with the `include-script-src` [directive](/guides/directives/include-script-src-directive.html).

The input file and the output folder can be customized in the [configuration](/guides/setup/configuration.html). You can customize both or only one of them.

Example of a custom definition of the input file and of the destination folder in `config/default.ts`:

    export default {
      workingDir: {
        scripts: 'custom-dir/scripts.js', // It must be a relative path to the `app` folder
        scriptsOutFolder: 'scripts' // relative path to the `out` folder
      }
    } as YassbConfig

In this example the entry point will be `./src/app/custom-dir/scripts.js` and the destination folder `out/scripts`.

## esbuild options

Extra [esbuild options](https://esbuild.github.io/api/#build) can be merged into the default ones with `esbuildOptions`:

    export default {
      esbuildOptions: {
        target: 'es2020',
        external: ['some-package']
      }
    } as YassbConfig

## Custom WebPack configuration (legacy)

Sites written for YASSB 1.x may keep a `webpackConfig`. It is still honoured, but webpack (and its loaders) must then be installed in the site itself: `npm install --save-dev webpack ts-loader`.
