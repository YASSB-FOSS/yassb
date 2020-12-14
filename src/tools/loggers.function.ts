/**
 * Minimally formatted message for the console to show the progress of the build process.
 *
 * @param step where the build process is at.
 */
export function logStep(step: string): void {
  console.log(` • Start ${step}`);
}

/**
 * * Minimally formatted message for the console to show what steps of build process have finished.
 *
 * @param what name of the step.
 */
export function logDone(what: string): void {
  console.log(`  - Done ${what}`);
}
