/**
 * Minimal argument parser: `yassb <command> [positionals] [--flag] [--key value] [--key=value]`.
 *
 * @internal
 */
export interface ParsedArgs {
  command: string | undefined;
  positionals: Array<string>;
  flags: { [name: string]: string | boolean };
}

/** Flags that take a value when written as `--key value`. */
const VALUE_FLAGS = new Set(['port', 'out', 'steps', 'section']);

/**
 * @internal
 */
export function parseArgs(argv: Array<string>): ParsedArgs {
  const positionals: Array<string> = [];
  const flags: { [name: string]: string | boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h')
      flags.help = true;
    else if (arg === '-v')
      flags.version = true;
    else if (arg.startsWith('--')) {
      const [name, value] = arg.slice(2).split(/=(.*)/s, 2);
      if (value !== undefined)
        flags[name] = value;
      else if (name.startsWith('no-'))
        flags[name.slice(3)] = false;
      else if (VALUE_FLAGS.has(name) && i + 1 < argv.length && !argv[i + 1].startsWith('--'))
        flags[name] = argv[++i];
      else
        flags[name] = true;
    } else
      positionals.push(arg);
  }
  return { command: positionals.shift(), positionals, flags };
}
