import { relative } from 'path';
import { assetsFileNameMaker } from '../../assets/assets-file-name-maker.function';
import { WORKING_DIR } from '../../config/working-dir.constant';
import type { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../yassb';
import { replaceAllLiteral } from '../tools/extract-directives.function';
import { YassbBaseDirective } from '../yassb-base-directive.class';

/**
 * `<!-- include-styles-src -->` → `<link rel="stylesheet" href="/assets/css/styles-1-0-0.min.css">`.
 */
export class InsertStylesSrc extends YassbBaseDirective implements YassbDirective {

  public static regex = /<!-- include-styles-src -->/g;

  constructor(args: YassbDirectiveProps) {
    super(args);
  }

  public init(): YassbDirectiveResponse {
    const filename = assetsFileNameMaker('styles');
    const absoluteUrl = relative(WORKING_DIR.out, WORKING_DIR.stylesOutFolder).replace(/\\/g, '/');
    const stylesElement = `<link rel="stylesheet" href="/${absoluteUrl}/${filename}">`;
    return { html: replaceAllLiteral(this.fileContents, '<!-- include-styles-src -->', stylesElement), data: {} };
  }

}
