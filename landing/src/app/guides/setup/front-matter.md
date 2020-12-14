---
title: Front Matter
order: 3
category: Setup
---
# Front Matter

## What is Front Matter

Front Matter is a popular way of adding useful information to text-based file and documents.

This metadata can be particularly useful in a no-server and no database environment as it can be used to store additional information about a document. For example, it could be used to define the `meta` information to be inserted in the `head` of a page. Or it could define the category of a blog post, or really whatever you want.

YASSB supports Front Matter in a variety of formats and flavours thanks to [gray-matter](https://www.npmjs.com/package/gray-matter). You can set all `gray-matter` options in the [configuration]({{url-to="configuration"}}).

The following examples will use the YAML formatting, but you can choose any other format supported by gray-matter (e.g. JSON).

## How and where to add Front Matter data

Front Matter data can be added to any text-based file to be processed by YASSB. Theoretically, one could even add Front Matter data to an svg file.

Front Matter is deeply integrated in YASSB. Whenever YASSB processes any kind of text-based file, it looks for Front Matter data and it stores it in memory. All Front Matter data is stored in the [`FRONT_MATTER_DATA_STORE`]({{url-to="FrontMatterDataStore"}}), indexed by the full absolute path to the file in which the Front Matter Data was found.

The full [`FRONT_MATTER_DATA_STORE`]({{url-to="FrontMatterDataStore"}}) is also passed to [custom directives]({{url-to="custom-directives"}}) and [custom renderers]({{url-to="custom-renderers"}}). In this way all the Front Matter data of the project is always available during the build process. While each page is being composed, its metadata and the metadata of any other page is available to all directives and renderers.

If you want to add [custom directives]({{url-to="custom-directives"}}) or [custom renderers]({{url-to="custom-renderers"}}), when reading any HTML file you can assume that its Front Matter, if any was set in the source file, will be avalable in the [`FRONT_MATTER_DATA_STORE`]({{url-to="FrontMatterDataStore"}}) indexed by the full path to the file itself.

Example:

    // source file: C:/my-project/public/blog/01.html
    // Generated from a MarkDown file with Front Matter.
    // accessing its Front Matter data:

    FRONT_MATTER_DATA_STORE['C:/my-project/public/blog/01.html']



For example, when invoking the [`generate-from-files` directive]({{url-to="generate-from-files"}}), any Front Matter data contained in each source file is added to the store. [Custom directives]({{url-to="custom-directives"}}) and [custom renderers]({{url-to="custom-renderers"}}) can then access such data.

## Injecting Front Matter data in pages

Front Matter data is injected automatically during compilation. 

Front Matter data is inserted wherever the key of any value of the metadata of a page is found between one set of curly brackets (a `insert` command).

Example:

    { author }

Note that there is only one set of curly brackets, to avoid confusion with the double curly brackets synthax of [directives]({{url-to="directives/index"}}).

The strategy to insert valuesdiffers depending on their type or key:

- `typeof === string`: inserted as is;
- `key === date`: parsed to a formatted date. The locale is the one bein processed if i18n is enabled, else it's `en`.
- all others: data is stringified with JSON.stringify(); 

In a template used to invoke the [`generate-from-files` directive]({{url-to="generate-from-files"}}) the above command could be used, for example, in the head of the page.

Example:

    // 2020/first-post.md
    ---
    title: My first blog post
    description: A very nice blog post
    keywords: blog, yassb, first
    ---
    # My first ...

    // blog/post-template.html
    ...
    <title>{ title }</title>
    <meta name="description" content="{ description }"/>
    <meta name="keywords" content="{ keywords }"/>

Result:

    // blog/2020/first-post.html
    <title>My first blog post</title>
    <meta name="description" content="A very nice blog post"/>
    <meta name="keywords" content="blog, yassb, first"/>

## Passing Front Matter data to directives

Front Matter data can also be passed to directives by placing the `insert` command inside the double quotes of any directive.

Front Matter data can be used for example to pass data to a custom directive that generates tags for a blog post.

Assuming that a [custom directive]({{url-to="custom-directive"}}) named `generate-tags` has been added to the [configuration]({{url-to="configuration"}}), we could do the following:

    // 2020/first-post.md
    ---
    ...
    tags:
    - sky
    - limit
    ---
    # My first ...

    // blog/post-template.html
    ...
    <title>{ title }</title>
    ...
    <body>
    ...
    <!-- generate-from-files="2020" -->

    <!-- generate-tags="{ tags }" -->

Result before the custom directive is invoked:

    // blog/2020/first-post.html
    ...
    <title>My first blog post</title>
    ...
    <body>
    ...
    <h1>My first blog post</h1>
    ...
    <!-- generate-tags="["sky", "limit"]" -->

Because Front Matter data is inserted *before* built-in and custom directives are invoked, when the `generate-tags` directive is executed it will be able to read the values passed to it.

When developing a [custom directive]({{url-to="custom-directives"}}) like in the example above, consider that you are in charge of writing the regular expression to match the directive comment. So if you don't like to have JSON data inside double quotes, you can opt for any other synthax, for example:

    <!-- generate-tags=["sky", "limit"] -->
