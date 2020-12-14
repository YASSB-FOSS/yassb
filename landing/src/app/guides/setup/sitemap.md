---
title: Sitemap
order: 5
category: Setup
---
# Sitemap

A full sitemap of the website is always generated at build time. The `sitemap.xml` file is temporarly stored in the `out` folder and is used by the [`url-to` directive]({{url-to="urlToDirective"}}) to resolve URLs.

By default, the `sitemap.xml` file is removed at the end of the build process.

If you want to keep the sitemap after the build process has finished, you need to specify the value `siteHost` in the [configuration]({{url-to="configuration"}}).

Example:

    export default {
      siteHost: "https://www.example.com/"
    } as YassbConfig

The `siteHost` is the base url of your website. Please note that the base url __must__ always start with `http` and end with a forward slash (`/`).

As of now support for sitemaps is limited. The generated sitemap only contains the list of all the assets of the website. Support of more granular info on each page (e.g. `priority`, `changefreq`, etc.) is planned for a future update, but there isn't a timeline for it yet. PRs are welcome to improve sitemaps generation.