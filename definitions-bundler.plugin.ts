import {
  readdirSync,
  readFileSync,
  removeSync,
  writeFileSync
  } from 'fs-extra';
import { resolve } from 'path';
import { ListFiles } from './src/tools/file-system-helpers/list-files.class';

export class DefinitionsBundler {

  private listOfFiles: Array<string>;
  private importsToRetain: Array<string> = [];
  private fileContents: string = '';
  private finalText: string;
  private emptyDirs: Array<string>;
  private basePath: string;

  constructor() { }

  public process(): void {
    this.setBasePath();
    this.listOfFiles = new ListFiles(this.basePath, file => file.endsWith('.d.ts')).init();
    this.listOfFiles.forEach(file => this.handleFile(file));
    this.addImports();
    this.addContents();
    this.listEmptyDirs();
    this.writeResult();
    this.removeEmptyDirs();
    this.cleanBundle();
    this.copyIndexToTools();
  }

  private setBasePath() {
    this.basePath = resolve(process.cwd(), 'bundle');
  }

  public handleFile(pathToFile: string): void {
    console.log('handleFile ~ pathToFile', pathToFile);
    let content = readFileSync(pathToFile, 'utf8');
    content = content.replace(/^import { .*? } from '@yassb.*?';/gm, '');
    const imports = content.match(/^import { .*? } from '.*?';/gm);
    content = content.replace(/^import { .*? } from '.*?';/gm, '');

    this.handleImportsToRetain(imports);

    this.fileContents += content;
    removeSync(pathToFile);
  }

  private handleImportsToRetain(imports: RegExpMatchArray) {
    if (imports && imports.length)
      imports.forEach(importString => {
        if (!this.importsToRetain.includes(importString))
          this.importsToRetain.push(importString);
      });
  }

  private addImports(): void {
    this.finalText = `${this.importsToRetain.join('\n')}\n\n`;
  }

  private addContents(): void {
    this.finalText += this.fileContents;
  }

  private listEmptyDirs(): void {
    this.emptyDirs = readdirSync(this.basePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => resolve(process.cwd(), 'bundle', dirent.name));
  }

  private writeResult(): void {
    writeFileSync(resolve(process.cwd(), 'bundle/index.d.ts'), this.finalText);
  }

  private removeEmptyDirs(): void {
    this.emptyDirs.forEach(dirPath => {
      removeSync(dirPath);
    });
  }

  /**
   * Delete all files in the bundle directory that do not include index in the file name
   */
  private cleanBundle(): void {
    const files = readdirSync(this.basePath);
    files.forEach(file => {
      if (!file.includes('index'))
        removeSync(resolve(this.basePath, file));
    });
  }

  /**
   * Creates a copy of index.d.ts in the bundle directory named tools.d.ts
   */
  private copyIndexToTools(): void {
    const index = readFileSync(resolve(this.basePath, 'index.d.ts'), 'utf8');
    writeFileSync(resolve(this.basePath, 'tools.d.ts'), index);
  }

}
