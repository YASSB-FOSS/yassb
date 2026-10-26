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
 * ` • Start <step>`
 *
 * @internal
 */
export function logStep(step: string): void {
  if (!quiet)
    console.log(` • Start ${step}`);
}

/**
 * `  - Done <step>`
 *
 * @internal
 */
export function logDone(what: string, durationMs?: number): void {
  if (!quiet)
    console.log(`  - Done ${what}${durationMs !== undefined ? ` (${Math.round(durationMs)} ms)` : ''}`);
}

/**
 * @internal
 */
export function logInfo(message: string): void {
  if (!quiet)
    console.log(message);
}
