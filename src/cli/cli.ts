import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseArgs, ParsedArgs } from './args';
import { runBuildWorker } from './build-worker';
import { buildCommand } from './commands/build';
import { checkCommand } from './commands/check';
import { docsCommand } from './commands/docs';
import { inspectCommand } from './commands/inspect';
import { newCommand } from './commands/new';
import { serveCommand } from './commands/serve';
import { watchCommand } from './commands/watch';

/**
 * Entry point of the `yassb` command (see `bin.js`).
 */

export const HELP = `YASSB — Yet Another Static Site Builder

Usage: yassb <command> [options]

Commands:
  build              Build the site into the output folder (default dist/public)
      --strict         exit with code 1 on any error (not only on crashes)
      --clean          empty the output folder first (dot files are kept)
      --out <dir>      build into another folder
      --json           print the result (diagnostics) as JSON
  watch              Build, serve on http://localhost:3000 and rebuild on every change
      --port <n>       port of the dev server (default: devServerPort or 3000)
      --clean          empty the output folder before the first build
  serve              Serve the output folder without building
      --port <n>
  new <name>         Create a new project in ./<name>
  inspect [query]    Describe the project: pages, components, data sources, renderers,
                     directives, translations. Read-only; does not build.
      --json           machine-readable manifest
      query            only show what concerns a file, data source, renderer or i18n key
  check              Build the site and validate it: directives, data sources, renderers,
                     translations, internal links, undeclared dependencies. Exit code 1 on errors.
      --json           machine-readable report
      --out <dir>      build into another folder
  docs [topic]       Print the YASSB guide (for people and coding agents)
      --list           list the topics
  help               Show this help
  --version          Show the version

Run inside a project folder (the one containing config/ and src/).
Agents: start with \`yassb docs\` and \`yassb inspect\`.
`;

export function version(): string {
  return JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8')).version;
}

export async function main(argv: Array<string> = process.argv.slice(2)): Promise<number> {
  const args: ParsedArgs = parseArgs(argv);

  if (args.flags.version) {
    console.log(version());
    return 0;
  }
  if (args.flags.help && args.command !== 'docs') {
    console.log(HELP);
    return 0;
  }

  switch (args.command) {
    case 'build':
      return buildCommand(args);
    case 'watch':
      await watchCommand(args);
      return new Promise<number>(() => undefined);
    case 'serve':
      return serveCommand(args);
    case 'new':
      return newCommand(args);
    case 'inspect':
      return inspectCommand(args);
    case 'check':
      return checkCommand(args);
    case 'docs':
      return docsCommand(args);
    case '__build':
      await runBuildWorker(args);
      return 0;
    case 'help':
    case undefined:
      console.log(HELP);
      return args.command ? 0 : 1;
    default:
      console.error(`Unknown command "${args.command}".\n`);
      console.log(HELP);
      return 1;
  }
}

if (require.main === module)
  run();

/** Runs the CLI and sets the exit code. */
export function run(): void {
  main().then(code => {
    process.exitCode = code;
  }, error => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
