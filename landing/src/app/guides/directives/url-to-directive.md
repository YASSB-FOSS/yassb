---
title: urlTo directive
order: 7
category: Directives
---
# `url-to` directive

Builds a full URL to any page or file of the website from a url fragment.

The `url-to` directive expects one argument:

    {url-to="myExampleUrl"}

Note that this directive is __not__ an HTML comment. In this way the directive can be invoked inside HTML DOM attributes, such as `href` attributes, without breaking HTML synthax.

The directive will search for matching URLs in the website and will return the full relative url to the specified page or asset. 

You can pass to the directive a camelcase strings (`myUrl`) even if the final url is in kebab case (`my-url`) or snake case (`my_url`). YASSB will find the proper asset to link to.

Example:

    // Page to link to: /my-long-to-reference-link/this-is-my-url.html

    <a href="{url-to="myExampleUrl"}">Go to my url</a>
    
    // Result
    <a href="/my-long-to-reference-link/this-is-my-url.html">Go to my url</a>

If multiple URLs are matched for the URL fragment passed to `url-to`, a warning is thrown in the console and the closest URL to the origin page is injected. To suppress the warning you can set in the options of the directive `warning` to `false`:

    // In an HTML file
    <a href="{{ url-to="index" options="{"warning":false}" }}">Home</a>

    // In a MarkDown file. Note: no whitespaces inside `url-to`
    // so the link is properly generated in converting Markdown to HTML
    [My Link]({{url-to"index"options="{"warning":false}"}}) 

If there are no matches for the URL fragment passed to `url-to`, an error is thrown in the console and an empty string is injected.

To find and match the full URLs from URL fragments the `url-to` directive relies on the auto-generated [sitemap]({{url-to="setup/sitemap"}}) of the website.