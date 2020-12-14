---
title: Post processors
order: 4
category: Setup
---
# Post processors

Post processors are custom functions that can be added in the [configuration]({{url-to="configuration"}}) to tackle the last details before the build finishes.

If a post processor is added to the build process, it will be run for every page of the website, so they should only be used when truly necessary.

Because post processors are executed before the build ends, they [still have access to the full Front Matter data]({{url-to="front-matter#cleanup"}}) of each file they process.

## Defining post processors

Post processors are JavaScript or TypeScript function (including JSX and TSX) of type [`PostProcessor`]({{url-to="yassb.html#postprocessor"}}).

Post processor receive one argument, a `string` representing the whole content of the file being processed. They __must__ return the full string, modified as needed.

Example:

    function myCustomPostProcessor(fileCont: string): string {
      return fileCont.replace('good', 'awesome');
    }

## Adding post processors

To add post processors in the [`configuration`]({{url-to="configuration"}}) push them to the `postProcessors` `Array`. 

All post post processors will be executedin the order in which they appear in the `Array`.

Example:

    module.exports {
      postProcessors: [
        myCustomPostProcessor
      ]
    }