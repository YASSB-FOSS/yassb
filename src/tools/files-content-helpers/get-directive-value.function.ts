import { SupportedDirectives } from '@yassb/config/supported-directives.const';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { DirectiveProps, DirectivePropsGetter } from '@yassb/directives/tools/directive-props-getter.class';
import { YassbConfig } from '@yassb/yassb';
import { isAbsolute, resolve } from 'path';

/**
 * Object with parsed directive data for quick access to the data passed to the directive
 *
 * @property `directiveProps` object of type `DirectiveProps`, an object whose keys are the HTML attribute name, and the value is the value passed of such attribute.
 * @property `directiveName` name of the directive. Stored as a value for quick reference.
 * @property `directiveMainValue` value passed to the attribute identifying the directive.
 * @property `fullPath` full absolute path to the file to read to get the data to inject or parse.
 */
export interface DirectiveData {
  directiveProps: DirectiveProps;
  directiveName: string;
  directiveMainValue: string;
  fullPath: string;
}

/**
 * Gets directive values
 *
 * @param fullDirectiveString full string of the directive to be parsed.
 * @param configOptions full YASSB configuration Object.
 * @param directiveName name of the directive in kebab case to identify the main value passed to the directive.
 * @param baseDir full absolute base path to resolve the relative path passed to the directive.
 * @returns all the directive values found as a DirectiveData object.
 */
export function getDirectiveValues(fullDirectiveString: string, configOptions: YassbConfig, directiveName: SupportedDirectives, baseDir: keyof typeof WORKING_DIR, lang?: string): DirectiveData {
  const directiveProps = new DirectivePropsGetter(fullDirectiveString, configOptions, lang).parse();
  const directiveMainValue = directiveProps[directiveName] as string;

  if (!directiveMainValue)
    return;

  const directiveData: DirectiveData = {
    directiveProps,
    directiveName,
    directiveMainValue,
    fullPath: isAbsolute(directiveMainValue) ? directiveMainValue : resolve(WORKING_DIR[baseDir], directiveMainValue)
  };
  return directiveData;
}
