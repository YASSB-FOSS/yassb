/**
 * `yassb watch` on the kitchen-sink fixture: changes to site code are picked up, errors in site code do not stop
 * the server, and fixing them recovers.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { copyFixture, removeFixture, runCli, Runtime, startCli, waitFor } from './helpers/fixture';

const dirs: Array<string> = [];
afterAll(() => dirs.forEach(removeFixture));

describe.each(['node', 'bun'] as Array<Runtime>)('yassb watch (%s)', runtime => {
  test('rebuilds on changes to code, recovers from errors', async () => {
    const dir = copyFixture('kitchen-sink');
    dirs.push(dir);
    const watch = startCli(dir, ['watch', '--port', '0'], runtime);
    try {
      let base = '';
      await waitFor(() => {
        const match = /on (http:\/\/localhost:\d+)/.exec(watch.output());
        if (match)
          base = match[1];
        return !!match;
      }, 60000, 'dev server');

      // While watch runs, another build of the same output folder is refused; another folder is fine.
      const blocked = runCli(dir, ['build'], runtime);
      expect(blocked.status).toBe(1);
      expect(blocked.stderr).toContain('OUTPUT_LOCKED');
      expect(blocked.stderr).toContain('`yassb watch`');
      expect(runCli(dir, ['build', '--out', 'elsewhere'], runtime).status).toBe(0);

      const page = await fetch(`${base}/`).then(response => response.text());
      expect(page).toContain('/__yassb/events');
      expect(page).toContain('English intro');
      expect((await fetch(`${base}/it/about`, { redirect: 'manual' })).status).toBe(301);

      const indexFile = join(dir, 'dist/public/en/index.html');
      const renderers = join(dir, 'builder/renderers.ts');
      const original = readFileSync(renderers, 'utf8');
      const status = () => fetch(`${base}/__yassb/status`).then(response => response.json()) as Promise<{ building: boolean; errors: Array<{ code: string }> }>;

      // 1. Change a renderer (site code loaded by the config): the pages use the new code.
      writeFileSync(renderers, original.replace('<ul class="news"', '<ul class="news changed"'));
      await waitFor(() => readFileSync(indexFile, 'utf8').includes('news changed'), 30000, 'renderer change');

      // 2. Break it: the error is reported and the server stays up.
      writeFileSync(renderers, original.replace('const limit =', 'if (lang) throw new Error("boom");\n  const limit ='));
      await waitFor(async () => (await status()).errors.some(error => error.code === 'RENDERER_FAILED'), 30000, 'error status');
      expect((await fetch(`${base}/`)).status).toBe(200);

      // 3. Syntax error in site code: reported, server still up.
      writeFileSync(renderers, `${original}\nexport const = ;\n`);
      await waitFor(async () => (await status()).errors.some(error => error.code === 'CONFIG_LOAD_FAILED'), 30000, 'syntax error status');
      expect((await fetch(`${base}/`)).status).toBe(200);

      // 4. Fix: back to normal.
      writeFileSync(renderers, original);
      await waitFor(async () => {
        const current = await status();
        return !current.building && current.errors.length === 0 && !readFileSync(indexFile, 'utf8').includes('news changed');
      }, 30000, 'recovery');

      // 5. A stylesheet change only recompiles the styles.
      const styles = join(dir, 'src/app/styles/styles.scss');
      writeFileSync(styles, `${readFileSync(styles, 'utf8')}\n.watch-test { color: red; }\n`);
      await waitFor(() => /✓ Built in \d+ ms \(styles\)/.test(watch.output()), 30000, 'styles-only rebuild');
      expect(readFileSync(join(dir, 'dist/public/assets/css/styles-1-2-3.min.css'), 'utf8')).toContain('.watch-test');
    } finally {
      watch.child.kill('SIGINT');
      await new Promise(resolvePromise => watch.child.once('exit', resolvePromise));
    }
    // The lock is released when watch stops.
    expect(runCli(dir, ['build'], runtime).status).toBe(0);
  }, 180000);
});
