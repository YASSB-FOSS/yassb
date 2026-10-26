import { existsSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Lists files recursively starting from a given path, in directory order.
 */
export class ListFiles {

  private files: Array<string> = [];

  /**
   * @param startingPath folder to scan; a missing folder gives an empty list.
   * @param condition filter on the file name.
   */
  constructor(
    private startingPath: string,
    private condition: (fileName: string) => boolean = () => true
  ) { }

  public init(): Array<string> {
    this.files = [];
    if (existsSync(this.startingPath))
      this.listFiles(this.startingPath);
    return this.files;
  }

  private listFiles(dir: string): void {
    for (const file of readdirSync(dir).sort()) {
      const newPath = resolve(dir, file);
      if (statSync(newPath).isDirectory())
        this.listFiles(newPath);
      else if (this.condition(file))
        this.files.push(newPath);
    }
  }

}

/** Whether `path` is an existing directory. */
export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
