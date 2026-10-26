/**
 * The feature catalogue check (scripts/features/feature-check.ts): the real catalogue is valid, and each rule
 * catches what it should on small synthetic sources.
 */
import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { checkFeatures, FeatureCheckConfig, Surfaces } from '../scripts/features/feature-check';
import { readSurfaces } from '../scripts/features/surfaces';
import { ROOT } from './helpers/fixture';

describe('feature catalogue of this repository', () => {
  test('is complete and documented in docs/guide.md', () => {
    const config: FeatureCheckConfig = JSON.parse(readFileSync(join(ROOT, 'features.config.json'), 'utf8'));
    const result = checkFeatures(ROOT, config, readSurfaces(ROOT));
    expect(result.errors).toEqual([]);
    const ids = result.features.map(feature => feature.id);
    expect(ids).toContain('directive.url-to');
    expect(ids).toContain('config.siteHost');
    expect(ids).toContain('cli.check');
  });
});

const FEATURE = (id: string, errors = 'none', options = 'none') => `/**
 * @feature ${id}
 * @summary Summary.
 * @usage Usage.
 * @options ${options}
 * @rules Rules.
 * @errors ${errors}
 * @status stable
 * @since 2.0.0
 */`;

function project(files: { [path: string]: string }, docs: string = ''): string {
  const root = mkdtempSync(join(tmpdir(), 'yassb-features-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  writeFileSync(join(root, 'guide.md'), docs);
  return root;
}

const config: FeatureCheckConfig = { sources: 'src', manifest: 'features.json', docs: [{ path: 'guide.md', enforce: true }] };
const noSurfaces: Surfaces = { directiveClasses: [], rendererNames: [], configOptions: [], commands: [], diagnosticCodes: [] };

describe('feature catalogue rules', () => {
  test('every export must declare @feature, @featurePart or @internal', () => {
    const root = project({ 'src/a.ts': 'export function helper() {}\n/** @internal */\nexport const x = 1;\n' });
    const { errors } = checkFeatures(root, config, noSurfaces);
    expect(errors).toEqual(['src/a.ts:1 helper: missing @feature, @featurePart or @internal. Is it part of what site authors can see or use?']);
  });

  test('a feature needs every field and a valid id, status and version', () => {
    const root = project({ 'src/a.ts': '/**\n * @feature thing\n * @summary S\n * @status maybe\n */\nexport class A {}\n' }, '<!-- feature: thing -->');
    const { errors } = checkFeatures(root, config, noSurfaces);
    expect(errors.some(error => error.includes('must be <kind>.<name>'))).toBe(true);
    for (const field of ['usage', 'options', 'rules', 'errors', 'since'])
      expect(errors.some(error => error.includes(`has no @${field}`))).toBe(true);
    expect(errors.some(error => error.includes('@status'))).toBe(true);
  });

  test('parts and related features must exist', () => {
    const root = project({ 'src/a.ts': `${FEATURE('api.a')}\nexport class A {}\n/** @featurePart api.nope */\nexport class B {}\n` }, '<!-- feature: api.a -->');
    const errors = checkFeatures(root, config, noSurfaces).errors;
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/^src\/a\.ts:\d+ B: @featurePart points to unknown feature "api\.nope"\.$/);
  });

  test('surfaces must have their feature; CLI flags must be documented', () => {
    const root = project({
      'src/a.ts': `${FEATURE('cli.build', 'none', '--strict: fail on errors')}\nexport function buildCommand() {}\n`,
      'src/yassb.ts': 'export interface YassbConfig {\n  /** @internal */\n  siteHost?: string;\n}\n'
    }, '<!-- feature: cli.build -->');
    const errors = checkFeatures(root, config, {
      ...noSurfaces,
      directiveClasses: ['UrlTo'],
      rendererNames: ['basicElement'],
      configOptions: ['siteHost'],
      commands: [{ name: 'build', flags: ['strict', 'json'] }]
    }).errors;
    expect(errors).toContain('Built-in directive UrlTo must define a @feature (on UrlTo).');
    expect(errors).toContain('Built-in renderer basicElement must define a @feature (on basicElement).');
    expect(errors).toContain('Configuration option siteHost must define a @feature (on YassbConfig.siteHost).');
    expect(errors).toContain('CLI command "build" reads --json, which is not listed in @options of "cli.build".');
    expect(errors.some(error => error.includes('--strict'))).toBe(false);
  });

  test('every diagnostic code belongs to a feature, and listed codes exist', () => {
    const root = project({ 'src/a.ts': `${FEATURE('api.a', 'KNOWN, GHOST')}\nexport class A {}\n` }, '<!-- feature: api.a -->');
    const errors = checkFeatures(root, config, { ...noSurfaces, diagnosticCodes: ['KNOWN', 'ORPHAN'] }).errors;
    expect(errors).toContain('src/a.ts:11: @errors of "api.a" lists unknown diagnostic code GHOST.');
    expect(errors).toContain('Diagnostic code ORPHAN is not listed in the @errors of any feature.');
  });

  test('docs must reference every feature and only existing ones', () => {
    const root = project({ 'src/a.ts': `${FEATURE('api.a')}\nexport class A {}\n${FEATURE('api.b')}\nexport class B {}\n` }, 'Text <!-- feature: api.a, api.old -->');
    const errors = checkFeatures(root, config, noSurfaces).errors;
    expect(errors).toContain('guide.md does not reference 1 feature(s): api.b');
    expect(errors.some(error => error.includes('references unknown feature "api.old"'))).toBe(true);
    // Not enforced: only a warning.
    const relaxed = checkFeatures(root, { ...config, docs: [{ path: 'guide.md', enforce: false }] }, noSurfaces);
    expect(relaxed.warnings).toEqual(['guide.md does not reference 1 feature(s): api.b']);
  });
});
