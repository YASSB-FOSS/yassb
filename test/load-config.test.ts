import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadConfig } from '../src/config/load-config';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

function project(files: { [name: string]: string }): string {
  const dir = mkdtempSync(join(tmpdir(), 'yassb-config-'));
  mkdirSync(join(dir, 'config'));
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(dir, 'config', name), content);
  return dir;
}

describe('config loading (compatible with the config package)', () => {
  test('reads default.ts with export default', () => {
    const dir = project({ 'default.ts': 'const port: number = 4000;\nexport default { devServerPort: port, workingDir: { out: "out" } };' });
    expect(loadConfig(dir).config).toEqual({ devServerPort: 4000, workingDir: { out: 'out' } });
  });

  test('merges environment, instance and local files in order', () => {
    process.env.NODE_ENV = 'production';
    process.env.NODE_APP_INSTANCE = '2';
    process.env.HOST = 'testhost';
    const dir = project({
      'default.json': JSON.stringify({ siteHost: 'a', workingDir: { out: 'x', src: 'src' }, postProcessors: [1, 2] }),
      'default-2.json': JSON.stringify({ username: 'two' }),
      'production.json': JSON.stringify({ siteHost: 'b', workingDir: { out: 'prod' }, postProcessors: [3] }),
      'local.json': JSON.stringify({ devServerPort: 9 })
    });
    const loaded = loadConfig(dir);
    expect(loaded.config as object).toEqual({ siteHost: 'b', username: 'two', workingDir: { out: 'prod', src: 'src' }, postProcessors: [3], devServerPort: 9 });
    expect(loaded.files.map(file => file.split('/').pop())).toEqual(['default.json', 'default-2.json', 'production.json', 'local.json']);
  });

  test('works without a config folder', () => {
    expect(loadConfig(mkdtempSync(join(tmpdir(), 'yassb-empty-'))).config).toEqual({});
  });
});
