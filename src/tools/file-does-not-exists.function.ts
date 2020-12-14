import { existsSync } from 'fs-extra';

/**
 * Checks if a file exists.
 *
 * @param pathToFile path to the file, needed to check if the file exists and is supported.
 * @param directiveName name of the directive, to be shown in the error message for better identification of the problem.
 * @param scope type of element to look for, either a component or a data source.
 * @returns true if does not exists
 */
export function fileDoesNotExists(pathToFile: string, directiveName: string, scope: 'component' | 'data-source'): boolean {
  if (existsSync(pathToFile))
    return false;

  console.error(`\nERROR ${scope} "${directiveName}" not found @ path: \n- ${pathToFile}\nNO content has been injected!`);
  return true;
}
