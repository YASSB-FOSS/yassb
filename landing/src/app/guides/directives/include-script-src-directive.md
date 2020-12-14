---
title: includeScriptSrc directive
order: 5
category: Directives
categoryOrder: 2
---
# `include-script-src` directive

Simple directive that injects a script src element. It does not require any parameter:

    <!-- include-script-src -->

YASSB will determine the name of the JS bundle previously generated, its absolute url, and will add it where the directive is found.

Please note that inserting the script src manually is not advised as the JS bundle filename contains the version of the website, as it appears in `package.json`. Manually writing the `src` attribute value will require to update the url to the file every time such version is changed.