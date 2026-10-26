import { relative } from 'path';
import { DIAGNOSTICS } from '../../diagnostics/diagnostics';
import { runBuild } from '../../pipeline/build';
import { setQuiet } from '../../tools/loggers.function';
import type { ParsedArgs } from '../args';

/**
 * `yassb build [--strict] [--clean] [--out <dir>] [--json]`
 */
export async function buildCommand(args: ParsedArgs): Promise<number> {
  const json = args.flags.json === true;
  if (json) {
    setQuiet(true);
    DIAGNOSTICS.silent = true;
  }

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

export function printSummary(ok: boolean, durationMs: number, out: string, diagnostics: Array<{ level: string; fatal?: boolean }>): void {
  const errors = diagnostics.filter(item => item.level === 'error').length;
  const warnings = diagnostics.filter(item => item.level === 'warning').length;
  const where = out ? ` → ${relative(process.cwd(), out) || '.'}` : '';
  const counts = `${errors} error(s), ${warnings} warning(s)`;
  if (!ok)
    console.error(`\n✗ Build failed in ${formatMs(durationMs)}${where} — ${counts}`);
  else if (errors)
    console.log(`\n⚠ Built in ${formatMs(durationMs)}${where} — ${counts} (use --strict to fail on errors)`);
  else
    console.log(`\n✓ Built in ${formatMs(durationMs)}${where} — ${counts}`);
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}
