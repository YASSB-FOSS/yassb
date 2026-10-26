import { isAbsolute, resolve } from 'path';
import { SupportedDirectives } from '../../config/supported-directives.const';
import { WORKING_DIR } from '../../config/working-dir.constant';
import { DirectiveProps, DirectivePropsGetter } from '../../directives/tools/directive-props-getter.class';
import type { WorkingDirConfig, YassbConfig } from '../../yassb';

/**
 * Parsed data of a directive that points to a file.
 *
 * @property `directiveProps` attributes of the directive.
 * @property `directiveName` name of the directive.
 * @property `directiveMainValue` value of the attribute named like the directive (the file path).
 * @property `fullPath` absolute path of that file.
 */
export interface DirectiveData {
  directiveProps: DirectiveProps;
  directiveName: string;
  directiveMainValue: string;
  fullPath: string;
}

/**
 * Reads a directive that points to a file, resolving the path against a project folder.
 *
 * @param fullDirectiveString the directive.
 * @param configOptions the YASSB configuration.
 * @param directiveName name of the directive (its main attribute).
 * @param baseDir project folder the path is relative to.
 * @param lang current language, replaces `LANG` in the directive.
 */
export function getDirectiveValues(fullDirectiveString: string, configOptions: YassbConfig, directiveName: SupportedDirectives, baseDir: keyof WorkingDirConfig, lang?: string): DirectiveData | undefined {
  const directiveProps = new DirectivePropsGetter(fullDirectiveString, configOptions, lang).parse();
  const directiveMainValue = directiveProps[directiveName] as string;

  if (!directiveMainValue)
    return undefined;

  return {
    directiveProps,
    directiveName,
    directiveMainValue,
    fullPath: isAbsolute(directiveMainValue) ? directiveMainValue : resolve(WORKING_DIR[baseDir], directiveMainValue)
  };
}
