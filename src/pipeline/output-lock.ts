import { createHash } from 'crypto';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Who is writing an output folder: stored in the lock file.
 * @featurePart behaviour.output-lock
 */
export interface OutputLockHolder {
  pid: number;
  /** `build`, `check` or `watch`. */
  command: string;
  /** Folder the command runs in. */
  cwd: string;
  out: string;
  startedAt: string;
}

/** @internal */
export type OutputLockResult =
  | { ok: true; release: () => void }
  | { ok: false; holder: OutputLockHolder };

/**
 * Environment variable set by `yassb watch` for its build processes: the lock belongs to the watch process.
 * @internal
 */
export const LOCK_OWNER_ENV = 'YASSB_LOCK_OWNER';

/**
 * Lock file of an output folder. It lives in the temporary folder of the system, not in the output, so it never
 * ends up in a deployment.
 * @internal
 */
export function lockPathFor(out: string): string {
  const hash = createHash('sha1').update(resolve(out)).digest('hex').slice(0, 20);
  return join(tmpdir(), 'yassb-locks', `${hash}.lock`);
}

/**
 * Takes the lock of an output folder, so that two YASSB processes never write the same folder at once
 * (they would delete and overwrite each other's files, leaving empty or mixed pages).
 *
 * @feature behaviour.output-lock
 * @summary Only one YASSB process at a time writes an output folder; a second one stops with a clear message.
 * @usage Running `yassb build` while `yassb watch` serves the same folder → error OUTPUT_LOCKED naming the other process.
 * @options none (use --out <dir> to build somewhere else)
 * @rules build and check hold the lock during the build; watch holds it for its whole session and its rebuilds share it; the lock file is in the system temporary folder (never in the output); a lock left by a process that no longer exists (crash, kill -9) is taken over (the message names the lock file to delete if its process id was reused); different output folders never conflict; the second process exits with code 1 without writing anything.
 * @errors OUTPUT_LOCKED
 * @status stable
 * @since 2.0.0
 * @related cli.build, cli.watch, cli.check
 */
export function acquireOutputLock(out: string, command: string): OutputLockResult {
  const path = lockPathFor(out);
  const owner = Number(process.env[LOCK_OWNER_ENV]) || process.pid;
  mkdirSync(join(tmpdir(), 'yassb-locks'), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, 'wx');
      const holder: OutputLockHolder = { pid: owner, command, cwd: process.cwd(), out: resolve(out), startedAt: new Date().toISOString() };
      writeSync(fd, JSON.stringify(holder));
      closeSync(fd);
      // A rebuild of `yassb watch` creates the lock on behalf of the watch process, which releases it when it stops.
      return { ok: true, release: () => owner === process.pid ? releaseOutputLock(out, owner) : undefined };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST')
        throw error;
    }

    const holder = readHolder(path);
    if (holder && holder.pid === owner)
      // Already ours (a rebuild of `yassb watch`): the owner releases it.
      return { ok: true, release: () => owner === process.pid ? releaseOutputLock(out, owner) : undefined };
    if (holder && isAlive(holder.pid))
      return { ok: false, holder };
    // Left by a process that no longer exists, or unreadable: take it over.
    rmSync(path, { force: true });
  }
  return { ok: false, holder: readHolder(path) || { pid: 0, command: 'unknown', cwd: '', out: resolve(out), startedAt: '' } };
}

/**
 * Removes the lock of `out` if it belongs to `owner`.
 * @internal
 */
export function releaseOutputLock(out: string, owner: number = process.pid): void {
  const path = lockPathFor(out);
  const holder = readHolder(path);
  if (holder && holder.pid === owner)
    rmSync(path, { force: true });
}

/**
 * Message and hint for a folder locked by another process.
 * @internal
 */
export function describeLock(holder: OutputLockHolder): { message: string; hint: string } {
  const since = holder.startedAt ? ` since ${new Date(holder.startedAt).toLocaleTimeString()}` : '';
  return {
    message: `Another YASSB process is writing ${holder.out}: \`yassb ${holder.command}\` (pid ${holder.pid}${since}, in ${holder.cwd}). Two processes writing the same folder corrupt each other's pages, so nothing was written.`,
    hint: `Stop it (Ctrl+C in its terminal, or \`kill ${holder.pid}\`), or build into another folder with --out <dir>. If no YASSB process is running, delete ${lockPathFor(holder.out)}.`
  };
}

function readHolder(path: string): OutputLockHolder | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function isAlive(pid: number): boolean {
  if (!pid)
    return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
