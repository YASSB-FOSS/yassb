/**
 * Front matter values of a page: from Markdown files, components with front matter, or the `data` returned by directives.
 * They replace `{ key }` placeholders in the page.
 */
export interface FrontMatterData {
  [key: string]: any;
}

/**
 * Front matter of every page, by absolute output path.
 */
export interface FrontMatterDataStore {
  [filePath: string]: FrontMatterData;
}

/**
 * Store of the front matter of each page of the current build.
 */
export const FRONT_MATTER_DATA_STORE: FrontMatterDataStore = {};

export function clearFrontMatterStore(): void {
  for (const key of Object.keys(FRONT_MATTER_DATA_STORE))
    delete FRONT_MATTER_DATA_STORE[key];
}
