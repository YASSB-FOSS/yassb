import type { WorkingDirConfig } from '../yassb';

/**
 * Absolute paths of the project folders, set by `workingDirSetter` at the start of every run.
 * See `WorkingDirConfig` in `src/yassb.ts` for what each folder holds and its default.
 *
 * @internal
 */
export const WORKING_DIR: WorkingDirConfig = {
  base: undefined as unknown as string,
  src: undefined as unknown as string,
  assets: undefined as unknown as string,
  i18n: undefined as unknown as string,
  app: undefined as unknown as string,
  pages: undefined as unknown as string,
  components: undefined as unknown as string,
  dataSources: undefined as unknown as string,
  pagesToGenerate: undefined as unknown as string,
  scripts: undefined as unknown as string,
  styles: undefined as unknown as string,
  posts: undefined as unknown as string,
  out: undefined as unknown as string,
  scriptsOutFolder: undefined as unknown as string,
  stylesOutFolder: undefined as unknown as string
};
