---
title: createFromDataSource directive
order: 2
category: Directives
categoryOrder: 2
---
# `create-from-data-source` directive

This is where things start to get more interesting. Instead of writing yourself long lists, you can make YASSB generate them for you based on a data-source you provide

The `create-from-data-source` directive expects two arguments, plus the options:

    <!-- create-from-data-source="[path-to-data-source].json" renderer="[custom-renderer-name]" options="[JSON-formatted-string]" -->

- `create-from-data-source [required: string]`: the path to the JSON file must be a relative path in the `data-sources` folder;

- `renderer [optional: string = basicElement]`: should be the name of either one of the [built-in renderers]({{url-to="renderers" options="{"warning": false}" }}), or the name of a [custom renderer]({{url-to="customRenderers"}}) as defined in the [configuration]({{url-to="configuration"}}). If the value of `renderer` is not set, YASSB will fall back on [`basicElement` renderer]({{url-to="basicElement-renderer"}});
- `options [optional: JSON formatted string]`: options to be passed to the renderer after parsing the string (`JSON.parse`).

The data source must be a valid JSON file, and must be of type `Array<any>`. 

Example of a data source:

    [
      { "color": red }
    ]

Please note that if you are using one of the built-in renderers you must adhere to the data structure expected by each built-in renderer as defined below. If you provide your own renderer via the config options, you can bring your own data structure. The full Array will be passed to your renderer.
