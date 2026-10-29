import { statSync } from 'fs';
import { relative, sep } from 'path';

/**
 * Files of the output folder that belong to the current build: written by it, or assets it kept because they were
 * unchanged. A build into an output folder that was not emptied also finds files of the previous build (pages of
 * the languages not rebuilt yet, files whose source was deleted): the list of files used by `url-to` and the
 * sitemap leaves them out, so it is the same as in a build into an empty folder.
 */

const files = new Set<string>();
/** Files the engine rewrote without them being part of this build (pages left over in a language folder). */
const rewritten = new Set<string>();
let startedAt = 0;

/**
 * Starts a new build (called by `resetBuildState`).
 *
 * @internal
 */
export function resetOutputFiles(): void {
  files.clear();
  rewritten.clear();
  startedAt = Date.now();
}

/**
 * Records a file written (or kept unchanged) in the output folder by the engine during the current build.
 *
 * @internal
 */
export function markOutputFile(path: string): void {
  files.add(path);
}

/**
 * Records that the engine rewrote a file of the output folder (directives, post-processing). A leftover page
 * rewritten this way is still not part of the build, although its modification time is recent.
 *
 * @internal
 */
export function markRewrittenOutputFile(path: string): void {
  if (!files.has(path))
    rewritten.add(path);
}

/**
 * Whether a file found in the output folder would also be there in a build into an empty folder at this point:
 * recorded by the engine, written during this build by site code (hooks, directives), or a dot file at the root
 * of the output, which emptying the folder keeps.
 *
 * @internal
 */
export function isCurrentOutputFile(path: string, out: string): boolean {
  if (files.has(path))
    return true;
  if (rewritten.has(path))
    return false;
  if (relative(out, path).split(sep)[0].startsWith('.'))
    return true;
  try {
    return statSync(path).mtimeMs >= startedAt;
  } catch {
    return false;
  }
}
