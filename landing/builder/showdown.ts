/**
 * Showdown output extension: escapes `{` inside code, so that examples of YASSB syntax written in the docs
 * (`{{ url-to="…" }}`, `{ title }`) are shown instead of being processed by the build.
 */
export const escapeBracesInCode = {
  type: 'output',
  filter: (html: string): string => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, code => code.replace(/\{/g, '&#123;'))
};
