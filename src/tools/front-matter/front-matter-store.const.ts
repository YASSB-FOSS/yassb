/**
 * Types of data that can be assigned as Front Matter.
 * We need to use unknown as the value cannot be predicted.
 */
export interface FrontMatterData {
  [key: string]: string | Array<unknown> | { [key: string]: unknown };
}

/**
 * Constant on which the Front Matter data of each file is stored.
 */
export interface FrontMatterDataStore {
  [filePath: string]: FrontMatterData;
}

/**
 * Constant on which the Front Matter data of each file is stored.
 */
export const FRONT_MATTER_DATA_STORE: FrontMatterDataStore = {};
