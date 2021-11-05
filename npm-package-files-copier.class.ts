import { readFileSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';

export class NpmPackageFilesCopierPlugin {

  private currentPath: string;
  private basePath: string;

  constructor() { }

  public copy(): void {
    this.setCurrentPath();
    this.setBasePath();
    this.copyFile('package.json');
    this.copyFile('bin.js');
    this.copyFile('README.md');
  }

  /**
   * Sets this.currentPath to the path of the current process
   */
  private setCurrentPath() {
    this.currentPath = process.cwd();
  }

  private setBasePath() {
    this.basePath = resolve(process.cwd(), 'bundle');
  }

  /**
   * Copies a given file from this.currenPath to this.basePath
   */
  private copyFile(file: string) {
    const filePath = resolve(this.currentPath, file);
    const destinationPath = resolve(this.basePath, file);
    writeFileSync(destinationPath, readFileSync(filePath));
  }

}

new NpmPackageFilesCopierPlugin().copy();
