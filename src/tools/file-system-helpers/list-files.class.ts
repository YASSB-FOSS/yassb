import { readdirSync, statSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Lists files recursively starting from a given path.
 */
export class ListFiles {

  /**
   * Full absolute paths of all the files found.
   */
  private files: Array<string> = [];

  /**
   * Creates an instance of list files.
   *
   * @param startingPath the starting path to look for files.
   * @param [condition] function to be evaluated as a condition (true/false) to filter files to be included in the list.
   */
  constructor(
    private startingPath: string,
    private condition: (path: string) => boolean = file => true
  ) { }

  /**
   * Inits list files
   *
   * @returns the full list of files as an `Array`
   */
  public init(): Array<string> {
    this.listFiles(this.startingPath);
    return this.files;
  }

  /**
   * Starts indexing the given directory and for each item found calls `handleFilePath`.
   *
   * @param dir the path to index.
   */
  private listFiles(dir: string): void {
    const files = readdirSync(dir);
    files.forEach(file => this.handleFilePath(file, dir));
  }

  /**
   * Checks wheather the path received is a file or a subdirectory.
   * If it is a file, the full path is added to the list, else `listFiles` is invoked to go down the rabbit hole.
   *
   * @param file the name of the file or folder found by `listFiles`.
   * @param dir the path to the file or folder found by `listFiles`.
   */
  private handleFilePath(file: string, dir: string): void {
    const newPath = resolve(dir, file);
    if (statSync(newPath).isDirectory())
      this.listFiles(newPath);
    else if (this.condition(file))
      this.files.push(resolve(dir, file));
  }

}
