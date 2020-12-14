---
title: Custom directives
order: 8
category: Directives
---
# Custom Directives

Custom directives are JavaScript or TypeScript Classes (`.js | .jsx | .ts | .tsx`) that can process HTML code and return such HTML code modified as needed.

A custom directive __must__ be of type [`YassbDirectiveConstructable`]({{url-to="YassbDirectiveConstructable"}}) and must expose one static property `regex`.

The property `regex` is the regular expression to be matched in order to invoke the directive. The regex should match the content of the string used to invoke the directive, taking into account any value passed in the directive. 

As explained in the [overview on directives]({{url-to="directives/index"}}), the string used to invoke the directive should be either:

- inside a one-line HTML comment `<!-- -->`; or
- betwenn double curly brackets `{{ }}}`.
  
In both cases, the first value inside the comment or between the curly brackets should be a kebab formatted string identifying the directive (usually, the name of the `Class` to be called in kebab case).

Example:

    <!-- my-custom-directive[="" ] ...[ [attibute-name]="[value]" ] -->

    {my-other-custom-directive[="" ] ...[ [attibute-name]="[value]" ]}

When invoked with `new`, the constructor receives one argument of type [`YassbDirectiveProps`]({{url-to="YassbDirectiveProps"}}), with four properties:

- `fileFullPath`: the full path of the file benig processed. This will be a subdirectory of the `out` folder;
- `fileContents`: the contents of the file in which the directive is found. Note that this will include the text injected by built-in directives (such as HTML code of child components), but does not contain the code of parent components;
- `lang`: the current language being processed if [i18n]({{url-to="internationalization"}}) is enabled;
- `config`: the full [configuration]({{url-to="configuration"}});
- `directiveFullString`: the full string matching the `RegEx` of the directive. If in `fileContents` the same directive is found more than once, a new instance of the directive is invoked for each one. In this way the logic of the `Class` only needs to take care of one directive at time;
- `frontMatterStore`: the full Front Matter data store, see [Front Matter]({{url-to="FrontMatter"options="{"warning":false}"}}).

Additionally, to be a valid custom directive a `Class` __must__ `implement` [`YassbDirective`]({{url-to="YassbDirective.html"}}) and it must expose one public method [`init()`]({{url-to="YassbDirective.html#init"}}) that must return an Object of type [`YassbDirectiveResponse`]({{url-to="YassbDirectiveResponse"}}).

Note that the object of type [`YassbDirectiveResponse`]({{url-to="YassbDirectiveResponse"}}) returned by `init()` contains two properties:

- `html`: this is the full HTML code passed to the directive, as modified by the directive itself. Directives __must__ always return the full HTML, not only the edited portions.
- `data`: object with arbitrary data pertaining to the page. This data is injected at the top of the page as `yaml` formatted Front Matter data and can be later used by other [directives]({{url-to="directives/index"}}) and [renderers]({{url-to="renderers/index"}}). The data is removed once the build process is finished.

Example:

    import { 
      YassbDirective, 
      YassbDirectiveProps, 
      YassbDirectiveResponse 
    } from '@yassb/yassb';

    export class MyCustomDirective implements YassbDirective {

      public static regex = /<!--\s*my-custom-directive\s*=\s*".+\..+"\s*-->/g;

      constructor(
        private args: YassbDirectiveProps
      ) { }

      public init(): YassbDirectiveResponse {
        // Directive's logic
        return { html: this.args.fileContents, data: {} };
      }
    }

## Adding custom directives

Custom directives that have been defined as described above can be added in the [configuration]({{url-to="configuration"}}).

 The non-initialized Class of type [`YassbDirectiveConstructable`]({{url-to="YassbDirectiveConstructable"}}) must be added as an element of the [`CustomDirectivesStore`]({{url-to="yassb.html#customdirectivesstore"}}) on the property `customDirectives`.

Example:

    // config/default.ts

    export default {
      customDirectives: [MyCustomDirective],
    } as YassbConfig

Note that custom directives will be processed in the order in which they are provided in the `Array` passed to `customDirectives`. Therefore, if the order in which your custom directives are processed is important, elements in the `Array` should be orderd consequently.
