import { checkProject } from '../../check/site-checks';
import { DIAGNOSTICS, formatDiagnostic } from '../../diagnostics/diagnostics';
import { setQuiet } from '../../tools/loggers.function';
import type { ParsedArgs } from '../args';
import { formatMs } from './build';

/**
 * `yassb check [--json] [--out <dir>] [--no-links]`: builds and validates the site. Exit code 1 on errors.
 */
export async function checkCommand(args: ParsedArgs): Promise<number> {
  const json = args.flags.json === true;
  setQuiet(true);
  DIAGNOSTICS.silent = true;
  if (!json)
    console.log('Building and checking the site...');

  const report = await checkProject({
    outDir: typeof args.flags.out === 'string' ? args.flags.out : undefined,
    links: args.flags.links !== false
  });

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  for (const level of ['error', 'warning', 'info'] as const) {
    const items = report.diagnostics.filter(item => item.level === level);
    if (!items.length)
      continue;
    console.log(`\n${level === 'error' ? 'Errors' : level === 'warning' ? 'Warnings' : 'Notes'} (${items.length}):`);
    for (const item of items)
      console.log(formatDiagnostic(item).split('\n').map(line => `  ${line}`).join('\n'));
  }

  const { error, warning, info } = report.counts;
  console.log(`\n${report.ok ? '✓' : '✗'} Checked in ${formatMs(report.durationMs)}: ${error} error(s), ${warning} warning(s), ${info} note(s).`);
  return report.ok ? 0 : 1;
}
