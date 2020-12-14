import { FRONT_MATTER_DATA_STORE, FrontMatterData } from '@yassb/tools/front-matter/front-matter-store.const';

/**
 * Stores and retrieves Front Matter data from `FRONT_MATTER_DATA_STORE`.
 */
export class FrontMatterHandler {

  /**
   * Gets the front matter data for a given file by its path.
   *
   * @param filePath full absolute path to the file.
   * @returns the Front Matter data of that file.
   */
  public static get(filePath: string): FrontMatterData {
    return FRONT_MATTER_DATA_STORE[filePath];
  }

  /**
   * Stores the front matter for a file, indexed by its full absolute path.
   * If the object for the given path does not exist, it is created first.
   *
   * @param filePath the full absolute path to the file.
   * @param data the data to store.
   */
  public static set(filePath: string, data: FrontMatterData): void {
    if (!FRONT_MATTER_DATA_STORE[filePath])
      FRONT_MATTER_DATA_STORE[filePath] = {};
    for (const key in data)
      if (data[key] !== undefined)
        FRONT_MATTER_DATA_STORE[filePath][key] = data[key];
  }

}
