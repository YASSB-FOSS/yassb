import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';

/**
 * Copies into `target` every file of `source` that is missing there or has different contents, and returns
 * their paths relative to `source`. Files only in `target` are left alone. Files with the same size and
 * modification time (assets copied unchanged) are not read.
 *
 * Each file is written next to its destination and renamed over it, so a browser loading the page never reads
 * a half-written file.
 *
 * @internal
 */
export function syncOutput(source: string, target: string): Array<string> {
  const changed: Array<string> = [];
  for (const file of listFiles(source)) {
    const destination = join(target, relative(source, file));
    if (existsSync(destination) && sameContents(file, destination))
      continue;
    mkdirSync(dirname(destination), { recursive: true });
    const temporary = `${destination}.yassb-sync`;
    copyFileSync(file, temporary);
    renameSync(temporary, destination);
    changed.push(relative(source, file));
  }
  return changed;
}

function sameContents(a: string, b: string): boolean {
  const statA = statSync(a);
  const statB = statSync(b);
  if (!statB.isFile() || statA.size !== statB.size)
    return false;
  if (Math.trunc(statA.mtimeMs) === Math.trunc(statB.mtimeMs))
    return true;
  return readFileSync(a).equals(readFileSync(b));
}

function listFiles(dir: string): Array<string> {
  if (!existsSync(dir))
    return [];
  const files: Array<string> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      files.push(...listFiles(path));
    else if (entry.isFile())
      files.push(path);
  }
  return files;
}
