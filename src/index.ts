import { setupYassb } from '@yassb/config/setup.function';
import { NewProjectMaker } from '@yassb/new-makers/new-project-maker.class';
import { buildAll } from '@yassb/runners/build';
import { devServer } from '@yassb/runners/server';
import { watch } from '@yassb/runners/watch';

/**
 * Gets the second or third argument passed to the CLI to determine the command.
 *
 * @see
 * https://nodejs.dev/learn/nodejs-accept-arguments-from-the-command-line
 */
const command = process.argv[0] === 'node' ? process.argv[3] : process.argv[2];

/**
 * Executes the command passed to YASSB via CLI
 *
 * @supports `build` || `watch`
 */
export function start(): void {

  switch (command) {
    case 'build':
      buildAll();
      break;
    case 'watch':
      watch();
      break;
    case 'serve':
      const config = setupYassb();
      devServer(config);
      break;
    case 'new':
      const projectName = process.argv[0] === 'node' ? process.argv[4] : process.argv[3];
      if (!projectName)
        return console.error('ERROR: you must provide a name for the project. Example: yassb new MyProject');
      new NewProjectMaker(projectName).init();
      break;
    default:
      console.error('No command passed to YASSB. Supported commands are:\n`build`\n`watch`\n`serve`\n`new [projectname]`');
  }
}

start();
