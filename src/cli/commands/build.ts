import { relative } from 'path';
import { DIAGNOSTICS } from '../../diagnostics/diagnostics';
import { runBuild } from '../../pipeline/build';
import { setQuiet } from '../../tools/loggers.function';
import { badges, c, formatCounts, formatMs, printBanner } from '../../tools/terminal';
import type { ParsedArgs } from '../args';

/**
 * `yassb build [--strict] [--clean] [--out <dir>] [--json]`
 *
 * @feature cli.build
 * @summary yassb build: production build of the site.
 * @usage yassb build [--strict] [--clean] [--out <dir>] [--json]
 * @options --strict: exit 1 on any error; --clean: empty the output first (dot files kept); --out <dir>: build into another folder; --json: print { ok, durationMs, out, diagnostics } instead of logs.
 * @rules Pages minified with htmlMinificationOptions, scripts minified; exit code 1 when site code throws, the config cannot load, a data source/stylesheet is invalid, or with --strict on any error; prints a summary with error/warning counts.
 * @errors none
 * @status stable
 * @since 1.0.0
 * @related behaviour.pipeline, behaviour.diagnostics, config.strict, config.cleanOut
 */
export async function buildCommand(args: ParsedArgs): Promise<number> {
  const json = args.flags.json === true;
  if (json) {
    setQuiet(true);
    DIAGNOSTICS.silent = true;
  } else
    printBanner('build');

  const result = await runBuild({
    strict: args.flags.strict === true,
    clean: args.flags.clean === true,
    outDir: typeof args.flags.out === 'string' ? args.flags.out : undefined
  });

  if (json) {
    const { ok, durationMs, out, diagnostics } = result;
    console.log(JSON.stringify({ ok, durationMs, out, diagnostics }, null, 2));
  } else
    printSummary(result.ok, result.durationMs, result.out, result.diagnostics);

  return result.ok ? 0 : 1;
}

/**
 * @internal
 */
export function printSummary(ok: boolean, durationMs: number, out: string, diagnostics: Array<{ level: string; fatal?: boolean }>): void {
  const errors = diagnostics.filter(item => item.level === 'error').length;
  const warnings = diagnostics.filter(item => item.level === 'warning').length;
  const where = out ? `  ${c.dim('→')} ${c.accent(relative(process.cwd(), out) || '.')}` : '';
  const counts = formatCounts({ errors, warnings });
  if (!ok)
    console.error(`\n  ${badges.fail('FAIL')}  build failed in ${c.bold(formatMs(durationMs))}${where}  ${counts}\n`);
  else if (errors)
    console.log(`\n  ${badges.warn('DONE')}  built in ${c.bold(formatMs(durationMs))}${where}  ${counts}  ${c.dim('(--strict fails on errors)')}\n`);
  else
    console.log(`\n  ${badges.ok('DONE')}  built in ${c.bold(formatMs(durationMs))}${where}  ${counts}\n`);
}
