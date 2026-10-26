/**
 * `bun scripts/check-features.ts`: checks the feature catalogue (see scripts/features/feature-check.ts) and
 * writes docs/features.json. Exit code 1 on errors. Part of `bun run build`.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { checkFeatures, FeatureCheckConfig } from './features/feature-check';
import { readSurfaces } from './features/surfaces';

const root = resolve(import.meta.dir, '..');
const config: FeatureCheckConfig = JSON.parse(readFileSync(join(root, 'features.config.json'), 'utf8'));
const result = checkFeatures(root, config, readSurfaces(root));

for (const warning of result.warnings)
  console.warn(`warning: ${warning}`);
for (const error of result.errors)
  console.error(`error: ${error}`);

if (result.errors.length) {
  console.error(`\n✗ Feature catalogue: ${result.errors.length} error(s). Rules: AGENTS.md → "Feature catalogue".`);
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
writeFileSync(join(root, config.manifest), `${JSON.stringify({ version, features: result.features }, null, 2)}\n`);
console.log(`✓ Feature catalogue: ${result.features.length} features, ${result.declarations.length} declarations checked${result.warnings.length ? `, ${result.warnings.length} warning(s)` : ''}.`);
