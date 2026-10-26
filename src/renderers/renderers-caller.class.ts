import { describeError, report } from '../diagnostics/diagnostics';
import { locate } from '../diagnostics/source-location';
import { FRONT_MATTER_DATA_STORE } from '../tools/front-matter/front-matter-store.const';
import type { RendererProps, YassbConfig } from '../yassb';
import { RENDERERS_STORE } from './renderers-store.constant';

/**
 * Calls the renderer named in a directive. Without a (known) renderer, falls back on `basicElement` as 1.x did,
 * and reports it. Exceptions thrown by renderers are reported with the directive's location.
 */
export class RenderersCaller<T> {

  constructor(
    private fileFullPath: string,
    private directiveFullString: string,
    private dataSource: T,
    private config: YassbConfig,
    private lang: string,
    private renderer: string | undefined,
    private options: unknown,
    private sourcePath?: string
  ) { }

  /**
   * @returns the HTML produced by the renderer ('' if it failed).
   */
  public callRenderer(): string {
    const args: RendererProps<T> = {
      currentFilePath: this.fileFullPath,
      lang: this.lang,
      source: this.dataSource,
      sourcePath: this.sourcePath,
      config: this.config,
      options: this.options,
      frontMatterStore: FRONT_MATTER_DATA_STORE
    };

    let name = this.renderer;
    if (!name || typeof RENDERERS_STORE[name] !== 'function') {
      const where = locate(this.fileFullPath, this.directiveFullString);
      if (!name)
        report({
          level: 'warning',
          code: 'RENDERER_MISSING',
          ...where,
          directive: this.directiveFullString,
          message: `No renderer in \`${this.directiveFullString}\`: falling back on basicElement.`,
          hint: 'Add renderer="nameOfRenderer" to the directive.'
        });
      else
        report({
          level: 'error',
          code: 'RENDERER_NOT_FOUND',
          ...where,
          directive: this.directiveFullString,
          message: `Renderer "${name}" not found: falling back on basicElement.`,
          hint: `Register it in config.customRenderers. Known renderers: ${Object.keys(RENDERERS_STORE).join(', ')}.`
        });
      name = 'basicElement';
    }

    try {
      const html = RENDERERS_STORE[name](args);
      return typeof html === 'string' ? html : String(html ?? '');
    } catch (error) {
      const { message, detail } = describeError(error);
      report({
        level: 'error',
        code: 'RENDERER_FAILED',
        fatal: true,
        ...locate(this.fileFullPath, this.directiveFullString),
        directive: this.directiveFullString,
        message: `Renderer "${name}" failed on \`${this.directiveFullString}\`: ${message}`,
        detail
      });
      return '';
    }
  }

}
