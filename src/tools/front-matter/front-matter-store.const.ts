/**
 * Front matter values of a page: from Markdown files, components with front matter, or the `data` returned by directives.
 * They replace `{ key }` placeholders in the page.
 *
 * @featurePart content.front-matter
 */
export interface FrontMatterData {
  [key: string]: any;
}

/**
 * Front matter of every page, by absolute output path.
 *
 * @featurePart content.front-matter
 */
export interface FrontMatterDataStore {
  [filePath: string]: FrontMatterData;
}

/**
 * Store of the front matter of each page of the current build.
 *
 * @featurePart content.front-matter
 */
export const FRONT_MATTER_DATA_STORE: FrontMatterDataStore = {};

/**
 * @internal
 */
export function clearFrontMatterStore(): void {
  for (const key of Object.keys(FRONT_MATTER_DATA_STORE))
    delete FRONT_MATTER_DATA_STORE[key];
}
