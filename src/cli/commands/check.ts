import { checkProject } from '../../check/site-checks';
import { DIAGNOSTICS } from '../../diagnostics/diagnostics';
import { setQuiet } from '../../tools/loggers.function';
import { badges, c, formatCounts, formatMs, glyph, printBanner, styleDiagnostic } from '../../tools/terminal';
import type { ParsedArgs } from '../args';

/**
 * `yassb check [--json] [--out <dir>] [--no-links]`: builds and validates the site. Exit code 1 on errors.
 *
 * @feature cli.check
 * @summary yassb check: builds the site and validates it; exit code 1 on errors.
 * @usage yassb check [--json] [--out <dir>] [--no-links]
 * @options --json: report { ok, counts, diagnostics }; --out <dir>: build into another folder; --no-links (same as --links=false): skip the link check.
 * @rules Builds in production mode (in the configured output unless --out), then adds: translation attributes left in pages, keys missing in some language file, keys never used, broken local href/src, components and data sources not used by any page, packages imported by site code but not declared in package.json; programmatic: checkProject().
 * @errors I18N_UNTRANSLATED_ATTRIBUTE, I18N_INCONSISTENT_KEYS, I18N_UNUSED_KEY, LINK_BROKEN, UNUSED_COMPONENT, UNUSED_DATA_SOURCE, UNDECLARED_DEPENDENCY
 * @status stable
 * @since 2.0.0
 * @related cli.inspect, behaviour.diagnostics
 */
export async function checkCommand(args: ParsedArgs): Promise<number> {
  const json = args.flags.json === true;
  setQuiet(true);
  DIAGNOSTICS.silent = true;
  if (!json) {
    printBanner('check');
    console.log(`  ${glyph.step} building and checking the site ${c.dim('…')}`);
  }

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
    const title = level === 'error' ? 'errors' : level === 'warning' ? 'warnings' : 'notes';
    console.log(`\n  ${c.bold(title.toUpperCase())} ${c.dim(`(${items.length})`)}\n`);
    for (const item of items)
      console.log(styleDiagnostic(item));
  }

  const { error, warning, info } = report.counts;
  const counts = formatCounts({ errors: error, warnings: warning, notes: info });
  console.log(`\n  ${report.ok ? badges.ok('PASS') : badges.fail('FAIL')}  checked in ${c.bold(formatMs(report.durationMs))}  ${counts}\n`);
  return report.ok ? 0 : 1;
}
