import { relative, resolve } from 'path';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { report } from '../../diagnostics/diagnostics';
import { locate } from '../../diagnostics/source-location';
import { RenderersCaller } from '../../renderers/renderers-caller.class';
import { ListFiles, isDirectory } from '../../tools/file-system-helpers/list-files.class';
import type { FilePathsForPublicFileList, YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { DirectivePropsGetter, DirectivePropsKeys } from '../tools/directive-props-getter.class';
import { replaceFirstLiteral } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';

/**
 * `<!-- public-file-list="downloads" renderer="filesList" -->`: lists the files of a folder of `out`
 * (recursively) and passes them to a custom renderer as `[{ absolutePath, absoluteUrl }]`.
 */
export class PublicFileList extends YassbBaseDirective implements YassbDirective {

  public static regex = /<!--\s*public-file-list\s*=\s*".+"\s* renderer\s*=\s*".+"\s*-->/g;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    const props = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang).parse();
    const dirToScan = props[DirectivePropsKeys['public-file-list']] as string;
    const renderer = props[DirectivePropsKeys.renderer] as string;
    const where = () => locate(this.fileFullPath, this.directiveFullString);

    if (!renderer || !this.config.customRenderers || !this.config.customRenderers[renderer]) {
      report({
        level: 'error',
        code: 'PUBLIC_FILE_LIST_RENDERER_NOT_FOUND',
        ...where(),
        directive: this.directiveFullString,
        message: `Renderer "${renderer}" not found for \`${this.directiveFullString}\`. List generation skipped.`,
        hint: 'Register the renderer in config.customRenderers.'
      });
      return { html: this.fileContents, data: {} };
    }

    const startingPath = resolve(WORKING_DIR.out, dirToScan);
    if (!isDirectory(startingPath)) {
      report({
        level: 'error',
        code: 'PUBLIC_FILE_LIST_NOT_FOUND',
        fatal: true,
        ...where(),
        directive: this.directiveFullString,
        message: `Folder "${dirToScan}" not found in the output (${startingPath}).`,
        hint: 'The path is relative to the output folder; files usually come from src/assets.'
      });
      return { html: this.fileContents, data: {} };
    }

    const source: Array<FilePathsForPublicFileList> = new ListFiles(startingPath).init().map(absolutePath => ({
      absolutePath,
      absoluteUrl: `/${relative(WORKING_DIR.out, absolutePath).replace(/\\/g, '/')}`
    }));

    const generatedContent = new RenderersCaller(
      this.fileFullPath,
      this.directiveFullString,
      source,
      this.config,
      this.lang,
      renderer,
      props[DirectivePropsKeys.options],
      startingPath
    ).callRenderer();

    return { html: replaceFirstLiteral(this.fileContents, this.directiveFullString, generatedContent), data: {} };
  }

}
