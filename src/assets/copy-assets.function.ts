import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, utimesSync } from 'fs';
import { relative, resolve } from 'path';
import { WORKING_DIR } from '../config/working-dir.constant';

/**
 * Copies a folder recursively. Files whose size and modification time are unchanged are skipped,
 * so repeated builds (watch mode) only copy what changed.
 *
 * @returns the number of files copied.
 *
 * @internal
 */
export function copyDirIncremental(from: string, to: string): number {
  if (!existsSync(from))
    return 0;
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const entry of readdirSync(from)) {
    const source = resolve(from, entry);
    const destination = resolve(to, entry);
    const stat = statSync(source);
    if (stat.isDirectory()) {
      copied += copyDirIncremental(source, destination);
      continue;
    }
    if (existsSync(destination)) {
      const current = statSync(destination);
      if (current.size === stat.size && Math.trunc(current.mtimeMs) === Math.trunc(stat.mtimeMs))
        continue;
    }
    copyFileSync(source, destination);
    utimesSync(destination, stat.atime, stat.mtime);
    copied++;
  }
  return copied;
}

/**
 * Copies `src/assets` to `out/assets` (same relative path as in `src`).
 *
 * @feature assets.copy
 * @summary src/assets is copied as it is to the output.
 * @usage src/assets/img/logo.png → <out>/assets/img/logo.png
 * @options workingDir.assets changes the folder.
 * @rules Copied first, before pages; files with unchanged size and modification time are skipped; files deleted from src stay in the output unless cleanOut.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related config.cleanOut
 */
export function copyAssets(): number {
  const relativeAssetsPath = relative(WORKING_DIR.src, WORKING_DIR.assets);
  return copyDirIncremental(WORKING_DIR.assets, resolve(WORKING_DIR.out, relativeAssetsPath));
}

/**
 * Copies every file of `pages` into `out/<lang>` (or `out`), overwriting the pages processed by the previous build.
 *
 * @featurePart behaviour.pipeline
 */
export function copyPages(lang?: string): void {
  const dest = lang ? resolve(WORKING_DIR.out, lang) : WORKING_DIR.out;
  copyAll(WORKING_DIR.pages, dest);
}

function copyAll(from: string, to: string): void {
  if (!existsSync(from))
    return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const source = resolve(from, entry);
    const destination = resolve(to, entry);
    if (statSync(source).isDirectory())
      copyAll(source, destination);
    else
      copyFileSync(source, destination);
  }
}

/**
 * Empties the output folder, keeping dot files at its root (`.git`, `.nojekyll`, …).
 *
 * @featurePart config.cleanOut
 */
export function cleanOut(): void {
  if (!existsSync(WORKING_DIR.out))
    return;
  for (const entry of readdirSync(WORKING_DIR.out))
    if (!entry.startsWith('.'))
      rmSync(resolve(WORKING_DIR.out, entry), { recursive: true, force: true });
}
