import { workingDirSetter } from '@yassb/config/working-dir-setter.function';
import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { FILES_TO_CREATE } from '@yassb/new-makers/files-to-create.const';
import { camelToKebabCase } from '@yassb/tools/strings-formatters/camel-to-kebab-case.function';
import { ensureDirSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';

/**
 * Creates a new project under a directory named after the project passed as a CLI argument.
 */
export class NewProjectMaker {

  constructor(
    private projectName: string
  ) { }

  public init(): void {
    this.normalizeName();
    this.setDirs();
    this.createConfigDir();
    this.loopFiles();
  }

  /**
   * Converts the name passed to a kebab case formatted string
   */
  private normalizeName(): void {
    this.projectName = camelToKebabCase(this.projectName);
  }

  /**
   * Calls `workingDirSetter` passing the `projectName` as the `base` name.
   * Because `workingDirSetter` creates the folders if none is found,
   * in this way the whole project structure is automaticlly created.
   */
  private setDirs(): void {
    workingDirSetter({ base: this.projectName }, true);
  }

  /**
   * Creates the config dir.
   */
  private createConfigDir(): void {
    ensureDirSync(resolve(WORKING_DIR.base, 'config'));
  }

  /**
   * Loops all keys of `FILES_TO_CREATE` and for each calls `createFile`
   */
  private loopFiles(): void {
    for (const fileRelativePath in FILES_TO_CREATE)
      this.createFile(fileRelativePath, FILES_TO_CREATE[fileRelativePath]);
  }

  /**
   * Creates a file in the provided relative path with the contents passed.
   *
   * @param fileRelativePath relative path to `base`.
   * @param fileContents contents of the file to write.
   */
  private createFile(fileRelativePath: string, fileContents: string): void {
    const absolutePath = resolve(WORKING_DIR.base, fileRelativePath);
    writeFileSync(absolutePath, fileContents.replace('PROJECT_NAME', this.projectName));
  }

}
