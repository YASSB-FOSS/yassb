/** Types of html-minifier-terser 7 (its CommonJS entry is not typed through package exports). */
declare module 'html-minifier-terser' {
  export function minify(html: string, options?: object): Promise<string>;
}
