/**
 * Public API of `yassb-web`.
 *
 * - Types for configurations, renderers and directives: `YassbConfig`, `RendererProps`, `YassbDirective`, …
 * - `YassbBaseDirective`, a base class for custom directives (also exported by `yassb-web/tools`).
 * - `defineConfig()`, an identity function that types a configuration.
 * - `runBuild()`, `inspectProject()`, `checkProject()` to drive YASSB from code (the current folder is the project).
 *
 * Importing this module has no side effects: the command line lives in `src/cli/cli.ts`.
 */
import type { YassbConfig } from './yassb';

export * from './yassb';
export { YassbBaseDirective } from './directives/yassb-base-directive.class';
export { runBuild } from './pipeline/build';
export type { BuildOptions, BuildSteps, DetailedBuildResult, SetupInfo } from './pipeline/build';
export { inspectProject } from './inspect/project-inspector';
export type { ProjectManifest } from './inspect/project-inspector';
export { checkProject } from './check/site-checks';
export type { CheckReport } from './check/site-checks';
export { DIAGNOSTIC_CODES, formatDiagnostic } from './diagnostics/diagnostics';

/** Types a configuration: `export default defineConfig({ ... })`. */
export function defineConfig(config: YassbConfig): YassbConfig {
  return config;
}
