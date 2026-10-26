import { relative } from 'path';
import { assetsFileNameMaker } from '../../assets/assets-file-name-maker.function';
import { WORKING_DIR } from '../../config/working-dir.constant';
import type { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { replaceAllLiteral } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';

/**
 * `<!-- include-script-src -->` → `<script src="/assets/js/main-1-0-0.min.js"></script>`.
 */
export class InsertScriptSrc extends YassbBaseDirective implements YassbDirective {

  public static regex = /<!-- include-script-src -->/g;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    const filename = assetsFileNameMaker('scripts');
    const absoluteUrl = relative(WORKING_DIR.out, WORKING_DIR.scriptsOutFolder).replace(/\\/g, '/');
    const scriptElement = `<script src="/${absoluteUrl}/${filename}"></script>`;
    return { html: replaceAllLiteral(this.fileContents, '<!-- include-script-src -->', scriptElement), data: {} };
  }

}
