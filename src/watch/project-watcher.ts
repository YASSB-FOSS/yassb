import { existsSync, FSWatcher, readdirSync, statSync, watch } from 'fs';
import { basename, resolve, sep } from 'path';

/**
 * Watches the project folders for changes and reports changed paths in batches.
 *
 * Uses the native `fs.watch`: one recursive watcher on macOS and Windows, one watcher per folder elsewhere
 * (so that ignored folders such as node_modules are never watched).
 *
 * Only real changes are reported. Some events do not change the file: Bun reports one on the source of a copy
 * (`copyFileSync` of a large file on macOS, as the asset copy does), and backups or indexing can touch metadata.
 * A file counts as changed when its status-change time (`ctime`) is recent (the last 2 seconds, which also
 * covers file systems with coarse timestamps) or differs from the last one seen, or, the first time, is later
 * than the start of the watcher. `ctime` changes with every write, rename or copy, even when the modification
 * time is preserved (Finder, `cp -p`). Removed files always count.
 */

/** A `ctime` this recent always counts as a change. */
const RECENT_MS = 2000;

/** Folder and file names never watched. */
const IGNORED_NAMES = new Set(['node_modules', '.git', '.hg', '.svn', '.yarn', '.cache', '.idea', '.vscode', '.DS_Store', '.turbo', '.next', 'Thumbs.db']);

/** Temporary files written by editors. */
function isEditorTempFile(name: string): boolean {
  return name.startsWith('.!') || name.endsWith('~') || name.endsWith('.swp') || name.endsWith('.swx') || name.endsWith('.tmp') || name.startsWith('.#') || /^\d+$/.test(name) || name.endsWith('.crswap');
}

/**
 * @featurePart cli.watch
 */
export interface ProjectWatcherOptions {
  roots: Array<string>;
  /** Extra paths to ignore (e.g. the output folder), checked on every event. */
  ignore: () => Array<string>;
  onChange: (paths: Array<string>) => void;
  /** Milliseconds to wait for more changes before reporting (an editor's save is often several events). Default: 30. */
  debounceMs?: number;
}

/**
 * @featurePart cli.watch
 */
export class ProjectWatcher {

  private watchers = new Map<string, FSWatcher>();
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | undefined;
  private recursive = process.platform === 'darwin' || process.platform === 'win32';
  /** Last `ctime` seen for each path. */
  private seen = new Map<string, number>();
  private startedAt = 0;

  constructor(private options: ProjectWatcherOptions) { }

  public start(): void {
    this.startedAt = Date.now();
    for (const root of this.options.roots) {
      if (!existsSync(root))
        continue;
      if (this.recursive)
        this.watchDir(root, true);
      else
        this.watchTree(root);
    }
  }

  public close(): void {
    for (const watcher of this.watchers.values())
      watcher.close();
    this.watchers.clear();
    if (this.timer)
      clearTimeout(this.timer);
  }

  public isIgnored(path: string): boolean {
    for (const ignored of this.options.ignore())
      if (path === ignored || path.startsWith(ignored + sep))
        return true;
    const parts = path.split(sep);
    if (parts.some(part => IGNORED_NAMES.has(part)))
      return true;
    return isEditorTempFile(basename(path));
  }

  private watchTree(dir: string): void {
    if (this.isIgnored(dir) || this.watchers.has(dir))
      return;
    this.watchDir(dir, false);
    let entries: Array<string> = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = resolve(dir, entry);
      try {
        if (statSync(path).isDirectory())
          this.watchTree(path);
      } catch {
        // removed in the meantime
      }
    }
  }

  private watchDir(dir: string, recursive: boolean): void {
    try {
      const watcher = watch(dir, { recursive }, (_event, filename) => {
        const path = filename ? resolve(dir, filename.toString()) : dir;
        this.queue(path);
        if (!this.recursive)
          this.refreshTree(path);
      });
      watcher.on('error', () => {
        watcher.close();
        this.watchers.delete(dir);
      });
      this.watchers.set(dir, watcher);
    } catch {
      // folder not watchable (permissions, removed): skip it
    }
  }

  /** New folders (non-recursive mode) get their own watchers; removed ones are dropped. */
  private refreshTree(path: string): void {
    if (existsSync(path)) {
      try {
        if (statSync(path).isDirectory())
          this.watchTree(path);
      } catch {
        // ignore
      }
      return;
    }
    for (const [dir, watcher] of this.watchers)
      if (dir === path || dir.startsWith(path + sep)) {
        watcher.close();
        this.watchers.delete(dir);
      }
  }

  private queue(path: string): void {
    if (this.isIgnored(path) || !this.hasChanged(path))
      return;
    this.pending.add(path);
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const paths = [...this.pending];
      this.pending.clear();
      this.options.onChange(paths);
    }, this.options.debounceMs ?? 30);
  }

  /** Whether an event on `path` comes with a change of the file (see the header). */
  private hasChanged(path: string): boolean {
    let ctime: number;
    try {
      ctime = statSync(path).ctimeMs;
    } catch {
      this.seen.delete(path);
      return true;
    }
    const last = this.seen.get(path);
    this.seen.set(path, ctime);
    if (ctime >= Date.now() - RECENT_MS)
      return true;
    return last === undefined ? ctime >= this.startedAt - RECENT_MS : ctime !== last;
  }

}
