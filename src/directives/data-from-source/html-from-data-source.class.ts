import { existsSync } from 'fs';
import { resolve } from 'path';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { describeError, report } from '../../diagnostics/diagnostics';
import { locate } from '../../diagnostics/source-location';
import { RenderersCaller } from '../../renderers/renderers-caller.class';
import { readTextCached } from '../../tools/file-cache';
import type { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { DirectivePropsGetter, DirectivePropsKeys } from '../tools/directive-props-getter.class';
import { replaceAllLiteral } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';

/**
 * `<!-- create-from-data-source="file.json" renderer="name" options="{...}" -->`
 *
 * Reads the JSON file (relative to the data-sources folder) and replaces the directive with the HTML returned by
 * the renderer. The renderer receives the parsed JSON as `source` and its absolute path as `sourcePath`.
 *
 * @feature directive.create-from-data-source
 * @summary Renders a JSON data source with a renderer and inserts the resulting HTML.
 * @usage <!-- create-from-data-source="people/team.json" renderer="peopleCards" options="{"limit":3}" -->
 * @options renderer: name in customRenderers or a built-in renderer (default basicElement); options: JSON passed to the renderer as props.options.
 * @rules One JSON file per directive, path relative to src/app/data-sources (sub-folders allowed); the file is parsed again for every directive, so renderers may mutate their data; the renderer receives source (parsed JSON) and sourcePath; every occurrence of the same directive text in the file is replaced; a missing file or name leaves the comment (removed by the minifier) and is reported; invalid JSON or a throwing renderer fail the build.
 * @errors DATA_SOURCE_MISSING_NAME, DATA_SOURCE_NOT_FOUND, DATA_SOURCE_INVALID_JSON
 * @status stable
 * @since 1.0.0
 * @related api.custom-renderers, directive.attributes, renderer.basicElement
 */
export class HtmlFromDataSource extends YassbBaseDirective implements YassbDirective {

  /**
   * Regex to match the comments to invoke the directive (one per line).
   */
  public static regex = /<!--\s*create-from-data-source\s*=\s*".+\..+"\s*-->/g;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    const getter = new DirectivePropsGetter(this.directiveFullString, this.config, this.lang);
    const props = getter.parse();
    const fileName = props[DirectivePropsKeys['create-from-data-source']] as string;
    const renderer = props[DirectivePropsKeys.renderer] as string;
    const where = () => locate(this.fileFullPath, this.directiveFullString);

    for (const error of getter.errors)
      report({ level: 'error', code: error.code, ...where(), directive: this.directiveFullString, message: `${error.message} in \`${this.directiveFullString}\`` });

    if (!fileName) {
      report({
        level: 'error',
        code: 'DATA_SOURCE_MISSING_NAME',
        ...where(),
        directive: this.directiveFullString,
        message: `No data source file in \`${this.directiveFullString}\`.`,
        hint: 'Write the JSON file name: <!-- create-from-data-source="items.json" renderer="itemsList" -->'
      });
      return { html: this.fileContents, data: {} };
    }

    const fullPath = resolve(WORKING_DIR.dataSources, fileName);

    if (!existsSync(fullPath)) {
      report({
        level: 'error',
        code: 'DATA_SOURCE_NOT_FOUND',
        ...where(),
        directive: this.directiveFullString,
        message: `Data source "${fileName}" not found at ${fullPath}. The block was not rendered.`,
        hint: 'Data source paths are relative to the data-sources folder (src/app/data-sources by default).'
      });
      return { html: this.fileContents, data: {} };
    }

    let source: unknown;
    try {
      source = JSON.parse(readTextCached(fullPath));
    } catch (error) {
      report({
        level: 'error',
        code: 'DATA_SOURCE_INVALID_JSON',
        fatal: true,
        file: fullPath,
        directive: this.directiveFullString,
        message: `Data source "${fileName}" is not valid JSON: ${describeError(error).message}`
      });
      return { html: replaceAllLiteral(this.fileContents, this.directiveFullString, ''), data: {} };
    }

    const componentContent = new RenderersCaller(
      this.fileFullPath,
      this.directiveFullString,
      source,
      this.config,
      this.lang,
      renderer,
      props[DirectivePropsKeys.options],
      fullPath
    ).callRenderer();

    return { html: replaceAllLiteral(this.fileContents, this.directiveFullString, componentContent), data: {} };
  }

}
