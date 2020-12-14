---
title: Overview
order: 0
slug: index
category: Assets
categoryOrder: 4
---
# Assets

YASSB takes care of all assets. 

For [scripts](/guides/assets/scripts.html) and [syles](/guides/assets/styles.html) see the separate sections.

All other assets (images, fonts, etc.) should be placed in a subfolder of the `src` folder. By default this folder is named `assets`. 

A custom path for the `assets` folder can be provided in the [configuration](/guides/setup/configuration.html). In this case it is possible also to define it as a subdirectory of another directory. 

Example of a custom definition of the assets folder in `config/default.ts`:

    export default {
      workingDir: {
        assets: 'client/assets'
      }
    } as YassbConfig


During the build process, all files contained in the `assets` folder are copied to the `out` directory, reflecting the hierarcy of the `src` folder.

Therefore, if the `assets` folder has been defined in configuration as a subfolder like in the example above, it will be a subdirectory also in the `out` folder.

Example:

    // Source
    /src/client/assets

    // Result in the `out` folder
    /client/assets

In this example, the file found in the project folder at `./src/client/assets/logo.png` will be accessible at the URL `/client/assets/logo.png`.