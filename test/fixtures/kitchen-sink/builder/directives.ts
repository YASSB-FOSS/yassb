import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from 'yassb-web';
import { YassbBaseDirective } from 'yassb-web/tools';

/** `<!-- shout="text" -->` → `<strong>TEXT</strong>`; replaces every occurrence on the first call. */
export class ShoutDirective extends YassbBaseDirective implements YassbDirective {
  public static regex = /<!--\s*shout="[^"]*"\s*-->/g;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    const html = this.fileContents.replace(/<!--\s*shout="([^"]*)"\s*-->/g, (_, text: string) => `<strong>${text.toUpperCase()}</strong>`);
    return { html, data: { shouted: 'yes' } };
  }
}

/** `<!-- page-stamp -->` → the page path relative to out; only on whole pages (not components). */
export class PageStampDirective implements YassbDirective {
  public static regex = /<!--\s*page-stamp\s*-->/g;

  constructor(private args: YassbDirectiveProps) { }

  public init(): YassbDirectiveResponse {
    const out = this.args.config.workingDir?.out as string;
    if (!this.args.fileFullPath.startsWith(out))
      return { html: this.args.fileContents, data: {} };
    const path = this.args.fileFullPath.slice(out.length + 1);
    return { html: this.args.fileContents.split(this.args.directiveFullString as string).join(`<small class="stamp">${path}</small>`), data: {} };
  }
}
