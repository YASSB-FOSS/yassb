import { existsSync, FSWatcher, readdirSync, statSync, watch } from 'fs';
import { basename, resolve, sep } from 'path';

/**
 * Watches the project folders for changes and reports changed paths in batches.
 *
 * Uses the native `fs.watch`: one recursive watcher on macOS and Windows, one watcher per folder elsewhere
 * (so that ignored folders such as node_modules are never watched).
 */

/** Folder and file names never watched. */
const IGNORED_NAMES = new Set(['node_modules', '.git', '.hg', '.svn', '.yarn', '.cache', '.idea', '.vscode', '.DS_Store', '.turbo', '.next', 'Thumbs.db']);

/** Temporary files written by editors. */
function isEditorTempFile(name: string): boolean {
  return name.startsWith('.!') || name.endsWith('~') || name.endsWith('.swp') || name.endsWith('.swx') || name.endsWith('.tmp') || name.startsWith('.#') || /^\d+$/.test(name) || name.endsWith('.crswap');
}

export interface ProjectWatcherOptions {
  roots: Array<string>;
  /** Extra paths to ignore (e.g. the output folder), checked on every event. */
  ignore: () => Array<string>;
  onChange: (paths: Array<string>) => void;
  /** Milliseconds to wait for more changes before reporting. Default: 80. */
  debounceMs?: number;
}

export class ProjectWatcher {

  private watchers = new Map<string, FSWatcher>();
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | undefined;
  private recursive = process.platform === 'darwin' || process.platform === 'win32';

  constructor(private options: ProjectWatcherOptions) { }

  public start(): void {
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
    if (this.isIgnored(path))
      return;
    this.pending.add(path);
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const paths = [...this.pending];
      this.pending.clear();
      this.options.onChange(paths);
    }, this.options.debounceMs ?? 80);
  }

}
