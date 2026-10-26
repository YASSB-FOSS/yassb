/** Minimal types of Showdown 2 (the package ships none). */
declare module 'showdown' {
  export class Converter {
    constructor(options?: { [option: string]: unknown });
    makeHtml(markdown: string): string;
  }
}
