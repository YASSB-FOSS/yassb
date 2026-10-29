import { badges, banner, c, failLine, yassbVersion } from '../tools/terminal';
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
 *
 * @featurePart cli.help
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
      --fresh          every build in a new process (slower; no warm builds or verification)
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

/**
 * @internal
 */
export function version(): string {
  return yassbVersion();
}

/**
 * The help with the banner on top and command names highlighted.
 */
function printHelp(): void {
  const body = HELP.split('\n').slice(1).join('\n').replace(/^\n+/, '');
  const styled = body.split('\n').map(line => {
    if (/^[A-Z][a-z]+:/.test(line) && !line.startsWith('Run') && !line.startsWith('Agents'))
      return c.bold(line);
    const command = /^(  )([a-z][\w-]*(?: [<\[][^>\]]+[>\]])?)(.*)$/.exec(line);
    if (command)
      return `${command[1]}${c.accent(command[2])}${command[3]}`;
    const flag = /^(\s+)(--\S+(?: <[^>]+>)?)(.*)$/.exec(line);
    if (flag)
      return `${flag[1]}${c.cyan(flag[2])}${c.dim(flag[3])}`;
    return line;
  }).map(line => line ? `  ${line}` : line).join('\n');
  console.log(`${banner()}  ${c.dim('Yet Another Static Site Builder')}\n\n${styled}`);
}

/**
 * @feature cli.help
 * @summary Command dispatch, help and version of the yassb command.
 * @usage yassb help   yassb --help   yassb --version
 * @options --help, -h: help; --version, -v: version.
 * @rules Unknown commands print the help and exit 1; the command runs in the current folder, which is the project root.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related cli.build
 */
export async function main(argv: Array<string> = process.argv.slice(2)): Promise<number> {
  const args: ParsedArgs = parseArgs(argv);

  if (args.flags.version) {
    console.log(version());
    return 0;
  }
  if (args.flags.help && args.command !== 'docs') {
    printHelp();
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
      printHelp();
      return args.command ? 0 : 1;
    default:
      printHelp();
      console.error(`${failLine(`Unknown command "${args.command}".`)}\n`);
      return 1;
  }
}

if (require.main === module)
  run();

/**
 * Runs the CLI and sets the exit code.
 *
 * @internal
 */
export function run(): void {
  main().then(code => {
    process.exitCode = code;
  }, error => {
    console.error(`\n${badges.fail('CRASH')} ${c.red('yassb stopped on an unexpected error')}\n`);
    console.error(c.dim(String(error instanceof Error ? error.stack : error)));
    process.exitCode = 1;
  });
}
