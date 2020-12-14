import { RENDERERS_STORE } from '@yassb/renderers/renderers-store.constant';
import { FRONT_MATTER_DATA_STORE } from '@yassb/tools/front-matter/front-matter-store.const';
import { RendererProps, YassbConfig } from '@yassb/yassb';

/**
 * Calls renderers to generate formatted contents
 *
 * @template T
 */
export class RenderersCaller<T> {

  /**
   * Creates an instance of renderers caller. It must receive all the params needed by `RenderersCaller` itself, plus those to be passed to renderers.
   *
   * @param fileFullPath full path of the file being processed.
   * @param directiveFullString full string of the directive that has invoked the directive and then the renderer.
   * @param dataSource the data to be passed to the rendere to generate the contents.
   * @param config the full YASSB config file.
   * @param lang the current language being processed.
   * @param renderer the name of the renderer to be called as specified in the directive being executed.
   * @param options the options defined in the directive.
   */
  constructor(
    private fileFullPath: string,
    private directiveFullString: string,
    private dataSource: T,
    private config: YassbConfig,
    private lang: string,
    private renderer: string,
    private options: Object
  ) { }

  /**
   * Calls the renderer specified in a directive to generate content.
   *
   * @returns the content generated by the renderer.
   */
  public callRenderer(): string {
    const args: RendererProps<T> = {
      currentFilePath: this.fileFullPath,
      lang: this.lang,
      source: this.dataSource,
      config: this.config,
      options: this.options,
      frontMatterStore: FRONT_MATTER_DATA_STORE
    };
    if (this.renderer && typeof RENDERERS_STORE[this.renderer] === 'function')
      return RENDERERS_STORE[this.renderer](args);

    if (!this.renderer)
      console.error(`WARNING Renderer not provided in directive ${this.directiveFullString}.\nTo define custom layouts, pass the name of the renderer by adding to the directive: \`renderer="nameOfCustomRenderer"\`.\nFalling back on \`basicElement\`.`);
    else
      console.error(`Renderer "${this.renderer}" not found. Did you forget to add custom templates?\nFalling back on basicElement.`);
    return RENDERERS_STORE.basicElement(args);

  }

}

