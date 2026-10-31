import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const { compareVersions } = require('../scripts/landing-version.cjs');

describe('landing publication versions', () => {
  test('orders numeric components rather than strings', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBe(1);
    expect(compareVersions('2.10.0', '2.9.9')).toBe(1);
    expect(compareVersions('10.0.0', '9.99.99')).toBe(1);
  });
  test('skips equal versions and downgrades, including build metadata', () => {
    expect(compareVersions('2.0.1', '2.0.1')).toBe(0);
    expect(compareVersions('2.0.0', '2.0.1')).toBe(-1);
    expect(compareVersions('1.99.99', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.1+new', '2.0.1+old')).toBe(0);
  });
  test('follows SemVer prerelease ordering', () => {
    const ordered = ['2.0.1-alpha', '2.0.1-alpha.1', '2.0.1-alpha.beta', '2.0.1-beta', '2.0.1-beta.2', '2.0.1-beta.11', '2.0.1-rc.1', '2.0.1'];
    for (let i = 1; i < ordered.length; i++) {
      expect(compareVersions(ordered[i], ordered[i - 1])).toBe(1);
      expect(compareVersions(ordered[i - 1], ordered[i])).toBe(-1);
    }
    expect(compareVersions('2.0.1-rc.1', '2.0.1-rc.1')).toBe(0);
  });
  test('rejects missing or malformed versions instead of deploying', () => {
    for (const version of [undefined, null, 2, '', '2.0', 'v2.0.1', '02.0.1', '2.0.1-01', '2.0.1-', '2.0.1+']) {
      expect(() => compareVersions(version, '2.0.1')).toThrow('Invalid landing version');
      expect(() => compareVersions('2.0.1', version)).toThrow('Invalid landing version');
    }
  });
});


describe('landing version check CLI', () => {
  test('reports whether the workflow should deploy without installing dependencies', () => {
    const dir = mkdtempSync(join(tmpdir(), 'yassb-version-test-'));
    try {
      const preload = join(dir, 'fetch.cjs');
      writeFileSync(preload, `global.fetch = async () => ({
        ok: process.env.TEST_HTTP_STATUS !== '503', status: 503,
        json: async () => ({ encoding: 'base64', content: Buffer.from(JSON.stringify({version: process.env.TEST_PUBLISHED_VERSION})).toString('base64') })
      });`);
      const output = join(dir, 'outputs');
      const source = JSON.parse(readFileSync(resolve('landing/package.json'), 'utf8')).version;
      for (const [published, shouldDeploy] of [['0.0.0', true], [source, false], ['999.0.0', false]]) {
        writeFileSync(output, '');
        const result = spawnSync('node', ['--require', preload, resolve('scripts/landing-version.cjs')], {
          env: { ...process.env, TEST_PUBLISHED_VERSION: String(published), GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8'
        });
        expect(result.status).toBe(0);
        expect(readFileSync(output, 'utf8')).toBe(`should_deploy=${shouldDeploy}\n`);
      }
      for (const env of [{ TEST_HTTP_STATUS: '503' }, { TEST_PUBLISHED_VERSION: 'invalid' }]) {
        writeFileSync(output, '');
        const result = spawnSync('node', ['--require', preload, resolve('scripts/landing-version.cjs')], {
          env: { ...process.env, ...env, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8'
        });
        expect(result.status).toBe(1);
        expect(readFileSync(output, 'utf8')).toBe('');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
