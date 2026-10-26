import { readFileSync, writeFileSync } from 'fs';
import { describeError, report } from '../diagnostics/diagnostics';
import { sourceFileOf } from '../diagnostics/source-location';
import { FrontMatterHandler } from '../tools/front-matter/front-matter-handler.class';
import { FrontMatterInjector } from '../tools/front-matter/front-matter-injector.class';
import type { YassbConfig } from '../yassb';

/**
 * Final step for one page: front matter placeholders, custom post processors, then minification
 * (`yassb build`) or the live-reload script (`yassb watch`).
 *
 * @feature behaviour.post-processing
 * @summary Last step for every HTML file of the output.
 * @usage automatic; customize with config.postProcessors and config.htmlMinificationOptions
 * @options none
 * @rules For every .html/.htm in the output (assets included): { key } placeholders → postProcessors in order → minification in build, or in watch the live-reload script before </body> and removal of the Content-Security-Policy meta; runs after translation.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related config.postProcessors, config.htmlMinificationOptions, behaviour.live-reload
 */
export class PostProcessFile {

  constructor(
    private pathToFile: string,
    private config: YassbConfig,
    private isWatching: boolean,
    private liveReloadSnippet?: string
  ) { }

  public async init(): Promise<void> {
    let contents = readFileSync(this.pathToFile, 'utf8');

    const fileData = FrontMatterHandler.get(this.pathToFile);
    if (fileData && typeof fileData === 'object')
      contents = new FrontMatterInjector(contents, fileData, sourceFileOf(this.pathToFile)).inject();

    for (const postProcessor of this.config.postProcessors || []) {
      try {
        const result = postProcessor(contents);
        if (typeof result === 'string')
          contents = result;
        else
          throw new Error(`returned ${typeof result} instead of the page HTML`);
      } catch (error) {
        const { message, detail } = describeError(error);
        report({
          level: 'error',
          code: 'POST_PROCESSOR_FAILED',
          fatal: true,
          file: sourceFileOf(this.pathToFile),
          message: `Post processor ${postProcessor.name || '(anonymous)'} failed on ${this.pathToFile}: ${message}`,
          detail
        });
      }
    }

    contents = this.isWatching ? this.prepareForWatch(contents) : await this.minify(contents);
    writeFileSync(this.pathToFile, contents);
  }

  /** Adds the live-reload script and removes the Content-Security-Policy meta tag (it would block it). */
  private prepareForWatch(contents: string): string {
    if (this.liveReloadSnippet && !contents.includes('/__yassb/events')) {
      if (contents.includes('</body>'))
        contents = contents.replace('</body>', () => `${this.liveReloadSnippet}</body>`);
      else if (/<html[\s>]/i.test(contents))
        contents += this.liveReloadSnippet;
    }
    if (contents.includes('<meta http-equiv="Content-Security-Policy" content="'))
      contents = contents.replace(/<meta http-equiv="Content-Security-Policy" content="[a-zA-z0-9';:\-\s/.]*">/gm, '');
    return contents;
  }

  private async minify(contents: string): Promise<string> {
    const { minify } = require('html-minifier-terser') as typeof import('html-minifier-terser');
    try {
      return await minify(contents, this.config.htmlMinificationOptions || {});
    } catch (error) {
      report({
        level: 'error',
        code: 'MINIFY_FAILED',
        file: sourceFileOf(this.pathToFile),
        message: `The page could not be minified (${describeError(error).message}); it was written unminified.`
      });
      return contents;
    }
  }

}
