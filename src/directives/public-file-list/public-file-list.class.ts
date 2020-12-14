import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { DirectivePropsGetter, DirectivePropsKeys } from '@yassb/directives/tools/directive-props-getter.class';
import { YassbBaseDirective } from '@yassb/directives/yassb-base-directive.class';
import { RenderersCaller } from '@yassb/renderers/renderers-caller.class';
import {
  FilePathsForPublicFileList,
  YassbDirective,
  YassbDirectiveProps,
  YassbDirectiveResponse
  } from '@yassb/yassb';
import { readdirSync, statSync } from 'fs-extra';
import { relative, resolve } from 'path';

/**
 * Generates a list of file found at a given path in the `out` folder and passes it to a `Renderer`
 */
export class PublicFileList extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive.
   */
  public static regex = /<!--\s*public-file-list\s*=\s*".+"\s* renderer\s*=\s*".+"\s*-->/g;

  /**
   * Public dir to scan to generate the file list
   */
  private dirToScan: string;
  /**
   * Renderer to generate the HTML to inject
   */
  private renderer: string;

  /**
   * Array wit the absolute URLs and paths of the files to be passed to the renderer
   */
  private source: Array<FilePathsForPublicFileList> = [];

  /**
   * Generated content produced by the renderer
   */
  private generatedContent: string;

  /**
   * Options set in the directive
   */
  private options: string | Array<unknown> | { [key: string]: unknown };

  /**
   * Creates an instance of public file list and calls `super` so YassbBaseDirective assigns the args to the protected properties.
   * Because the name of the js file is known, the only value actually used is `fileContents`.
   *
   * @param args
   */
  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  /**
   * Inits public file list. Aborts if the renderer is not found.
   * Else generates the list and calls the renderer.
   *
   * @returns init
   */
  public init(): YassbDirectiveResponse {
    this.setPathAndRenderer();

    if (!this.renderer || !this.config.customRenderers || !this.config.customRenderers[this.renderer])
      return this.errorNoRenderer();

    const startingPath = resolve(WORKING_DIR.out, this.dirToScan);
    this.listFiles(startingPath);

    this.callRenderer();

    return { html: this.fileContents.replace(this.directiveFullString, this.generatedContent), data: {} };
  }

  /**
   * Sets the base path to scan and the renderer by passing the `directiveFullString` to `DirectivePropsGetter`.
   */
  private setPathAndRenderer(): void {
    const directiveProps = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang).parse();
    this.dirToScan = directiveProps[DirectivePropsKeys['public-file-list']] as string;
    this.renderer = directiveProps[DirectivePropsKeys.renderer] as string;
    this.options = directiveProps[DirectivePropsKeys.options];
  }

  /**
   * If there is a fatal error the fileContents are returned untouched.
   *
   * @returns no renderer
   */
  private errorNoRenderer(): YassbDirectiveResponse {
    console.error(`ERROR function '${this.renderer}' not found. Did you pass it as a key of 'customRenderers' in the 'config' options?\nList generation skipped.`);
    return { html: this.fileContents, data: {} };
  }

  /**
   * Lists files at the given folder, searching recursively in sub dirs.
   * Does not rely on ListFiles to avoid an extra `forEach` loop.
   * Here, if it finds a file, it immediately adds it to the list.
   *
   * @param dir path to scan. Because this method calls itself recursively, it can be a subdir of `startingPath`.
   */
  private listFiles(dir: string): void {
    const files = readdirSync(dir);
    files.forEach(file => {
      const newPath = resolve(dir, file);
      if (statSync(newPath).isDirectory())
        this.listFiles(newPath);
      else
        this.makeValuesForSource(dir, file);
    });
  }

  /**
   * Determines the absolutePath and the absolute URL of the file.
   * Done here instead of delegating this to the renderer to make life easiier for renderers.
   *
   * @param dir the directory where the file was found.
   * @param file the name of the file.
   */
  private makeValuesForSource(dir: string, file: string): void {
    const absolutePath = resolve(dir, file);
    const absoluteUrl = `/${relative(WORKING_DIR.out, absolutePath).replace(/\\/g, '/')}`;
    this.source.push({
      absolutePath,
      absoluteUrl
    });
  }

  /**
   * Calls the renderer and sets the response as the `generatedContent`.
   */
  private callRenderer(): void {
    this.generatedContent = new RenderersCaller(
      this.fileFullPath,
      this.directiveFullString,
      this.source,
      this.config,
      this.lang,
      this.renderer,
      this.options
    ).callRenderer();
  }

}
