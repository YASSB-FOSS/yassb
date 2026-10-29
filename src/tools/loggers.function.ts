import { c, glyph, stepLine } from './terminal';

/**
 * Progress messages of the build. Silenced with `setQuiet(true)` (e.g. `--json` output).
 */
let quiet = false;

/**
 * @internal
 */
export function setQuiet(value: boolean): void {
  quiet = value;
}

/**
 * @internal
 */
export function isQuiet(): boolean {
  return quiet;
}

/**
 * A step starts. Nothing is printed: steps run in parallel (scripts are bundled while pages are built), so a
 * step is printed once, when it is done, with its duration.
 *
 * @internal
 */
export function logStep(_step: string): void {
  // printed by logDone
}

/**
 * `  › <step>        18 ms`
 *
 * @internal
 */
export function logDone(what: string, durationMs?: number): void {
  if (!quiet)
    console.log(stepLine(what, durationMs));
}

/**
 * `  ● <label> <message>`: a note printed during the build.
 *
 * @internal
 */
export function logNote(label: string, message: string): void {
  if (!quiet)
    console.log(`  ${glyph.info} ${c.cyan(label)} ${message}`);
}

/**
 * @internal
 */
export function logInfo(message: string): void {
  if (!quiet)
    console.log(message);
}
