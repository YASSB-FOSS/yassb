import { FRONT_MATTER_DATA_STORE, FrontMatterData } from './front-matter-store.const';

/**
 * Reads and writes the front matter of pages in `FRONT_MATTER_DATA_STORE`, by absolute output path.
 */
export class FrontMatterHandler {

  public static get(filePath: string): FrontMatterData {
    return FRONT_MATTER_DATA_STORE[filePath];
  }

  /** Adds `data` to the front matter of `filePath` (undefined values are ignored). */
  public static set(filePath: string, data: FrontMatterData): void {
    if (!FRONT_MATTER_DATA_STORE[filePath])
      FRONT_MATTER_DATA_STORE[filePath] = {};
    for (const key in data)
      if (data[key] !== undefined)
        FRONT_MATTER_DATA_STORE[filePath][key] = data[key];
  }

}
