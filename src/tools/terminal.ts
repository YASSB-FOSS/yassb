import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Styling of everything the CLI prints: colours, glyphs, the banner, summaries.
 *
 * Colours are used when stdout is a terminal, unless NO_COLOR is set; FORCE_COLOR forces them (the watch
 * process sets it for its build processes, whose output is piped). Without colours the layout is the same,
 * so logs of CI and coding agents read the same text.
 */

const env = process.env;

function detectColor(): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '')
    return false;
  if (env.FORCE_COLOR !== undefined)
    return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false';
  return !!process.stdout.isTTY && env.TERM !== 'dumb';
}

/**
 * @internal
 */
export const COLOR = detectColor();
const TRUECOLOR = COLOR && (env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit');

const sgr = (open: string, close: string) => (text: string | number): string =>
  COLOR ? `\x1b[${open}m${text}\x1b[${close}m` : String(text);
const rgb = (hex: string, fallback: string, background = false): string => {
  if (!TRUECOLOR)
    return fallback;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `${background ? 48 : 38};2;${r};${g};${b}`;
};

/**
 * Text styles (no-ops without colours). The accent is the violet of the website.
 *
 * @internal
 */
export const c = {
  bold: sgr('1', '22'),
  dim: sgr('2', '22'),
  underline: sgr('4', '24'),
  red: sgr('31', '39'),
  green: sgr('32', '39'),
  yellow: sgr('33', '39'),
  cyan: sgr('36', '39'),
  accent: sgr(rgb('#c4b5fd', '35'), '39'),
  pink: sgr(rgb('#f9a8d4', '95'), '39')
};

/** A label on a coloured background, e.g. ` DONE `. Plain text without colours. */
function badge(text: string, background: string): string {
  return COLOR ? `\x1b[1;${background};97m ${text} \x1b[0m` : text;
}

/**
 * @internal
 */
export const badges = {
  brand: (text: string) => badge(text, rgb('#7c3aed', '45', true)),
  ok: (text: string) => badge(text, '42'),
  warn: (text: string) => badge(text, '43'),
  fail: (text: string) => badge(text, '41')
};

/**
 * Glyphs, one per kind of line. Plain Unicode symbols, never emoji.
 *
 * @internal
 */
export const glyph = {
  step: c.accent('›'),
  ok: c.green('✓'),
  fail: c.red('✗'),
  warn: c.yellow('▲'),
  info: c.cyan('●'),
  sync: c.accent('↻'),
  ready: c.green('●')
};

/**
 * @internal
 */
export function yassbVersion(): string {
  return JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8')).version;
}

function runtime(): string {
  const bun = (process.versions as { bun?: string }).bun;
  return bun ? `bun ${bun}` : `node ${process.version.replace(/^v/, '')}`;
}

/**
 * The first line of every command: `YASSB v2.4.0  build  node 22.11.0`.
 *
 * @internal
 */
export function banner(command?: string): string {
  const parts = [badges.brand('YASSB'), c.accent(`v${yassbVersion()}`)];
  if (command)
    parts.push(c.bold(command));
  parts.push(c.dim(runtime()));
  return `\n  ${parts.join('  ')}\n`;
}

/**
 * @internal
 */
export function printBanner(command?: string): void {
  console.log(banner(command));
}

/**
 * `42 ms` / `1.20 s`.
 *
 * @internal
 */
export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

/**
 * `0 errors · 1 warning`, with non-zero counts coloured.
 *
 * @internal
 */
export function formatCounts(counts: { errors: number; warnings: number; notes?: number }): string {
  const part = (n: number, word: string, paint: (text: string) => string) => {
    const text = `${n} ${word}${n === 1 ? '' : 's'}`;
    return n ? paint(text) : c.dim(text);
  };
  const parts = [part(counts.errors, 'error', c.red), part(counts.warnings, 'warning', c.yellow)];
  if (counts.notes !== undefined)
    parts.push(part(counts.notes, 'note', c.cyan));
  return parts.join(c.dim(' · '));
}

/**
 * `  14:32:05`, dimmed: the prefix of watch events.
 *
 * @internal
 */
export function timestamp(): string {
  return `  ${c.dim(new Date().toTimeString().slice(0, 8))}`;
}

/**
 * A finished step: `  › html en              18 ms`.
 *
 * @internal
 */
export function stepLine(name: string, durationMs?: number): string {
  const time = durationMs === undefined ? '' : c.dim(formatMs(durationMs).padStart(8));
  return `  ${glyph.step} ${name.padEnd(24)}${time}`;
}

/**
 * A diagnostic as printed in the terminal:
 * `  ▲ warning CODE file:line`, then the message and the hint, indented. The first line keeps the text of
 * `formatDiagnostic` (`<level> <CODE> <file>:<line>`), which tools and agents search for.
 *
 * @internal
 */
export function styleDiagnostic(diagnostic: { level: string; code: string; file?: string; line?: number; message: string; hint?: string }): string {
  const paint = diagnostic.level === 'error' ? c.red : diagnostic.level === 'warning' ? c.yellow : c.cyan;
  const mark = diagnostic.level === 'error' ? glyph.fail : diagnostic.level === 'warning' ? glyph.warn : glyph.info;
  const where = diagnostic.file ? ` ${c.underline(`${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ''}`)}` : '';
  const lines = [`  ${mark} ${paint(c.bold(diagnostic.level))} ${c.bold(diagnostic.code)}${where}`];
  lines.push(...diagnostic.message.split('\n').map(line => `    ${line}`));
  if (diagnostic.hint)
    lines.push(`    ${c.dim('hint:')} ${c.dim(diagnostic.hint)}`);
  return lines.join('\n');
}

/**
 * An error of the CLI itself (wrong arguments, a folder that exists…): `  ✗ <message>`.
 *
 * @internal
 */
export function failLine(message: string): string {
  return `  ${glyph.fail} ${c.red(message)}`;
}
