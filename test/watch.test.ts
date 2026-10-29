/**
 * `yassb watch` on the kitchen-sink fixture: changes to site code are picked up, errors in site code do not stop
 * the server, and fixing them recovers.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync, rmSync, writeFileSync } from 'fs';
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

      // 5. Content changes (a translation file) run in the process started in advance after the previous build:
      //    each one is picked up.
      const en = join(dir, 'src/i18n/en.json');
      const enOriginal = readFileSync(en, 'utf8');
      for (const word of ['first', 'second']) {
        writeFileSync(en, enOriginal.replace('"Hello & welcome"', `"Hello & ${word} welcome"`));
        await waitFor(() => readFileSync(indexFile, 'utf8').includes(`Hello &amp; ${word} welcome`), 30000, `translation change (${word})`);
      }
      writeFileSync(en, enOriginal);
      await waitFor(() => !readFileSync(indexFile, 'utf8').includes('second welcome'), 30000, 'translation restored');

      // 6. A stylesheet change only recompiles the styles.
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

  test('picks up directives changed, added and removed, and data read by site code at load time', async () => {
    const dir = copyFixture('kitchen-sink');
    dirs.push(dir);
    const watch = startCli(dir, ['watch', '--port', '0'], runtime);
    const indexFile = join(dir, 'dist/public/en/index.html');
    const page = () => readFileSync(indexFile, 'utf8');
    try {
      await waitFor(() => /on http:\/\/localhost:\d+/.test(watch.output()), 60000, 'dev server');

      // 1. A directive is changed.
      const directives = join(dir, 'builder/directives.ts');
      writeFileSync(directives, readFileSync(directives, 'utf8').replace('`<strong>${text.toUpperCase()}</strong>`', '`<strong class="v2">${text.toUpperCase()}</strong>`'));
      await waitFor(() => page().includes('<strong class="v2">LOUD</strong>'), 30000, 'changed directive');

      // 2. A directive is added: new file, used by a page, registered in the configuration.
      const echo = join(dir, 'builder/echo.ts');
      writeFileSync(echo, [
        "import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from 'yassb-web';",
        'export class EchoDirective implements YassbDirective {',
        '  public static regex = /<!--\\s*echo\\s*-->/g;',
        '  constructor(private args: YassbDirectiveProps) { }',
        "  public init(): YassbDirectiveResponse { return { html: this.args.fileContents.split(this.args.directiveFullString as string).join('<em>echoed</em>'), data: {} }; }",
        '}',
        ''
      ].join('\n'));
      const index = join(dir, 'src/app/pages/index.html');
      writeFileSync(index, readFileSync(index, 'utf8').replace('<!-- page-stamp -->', '<!-- page-stamp --> <!-- echo -->'));
      const config = join(dir, 'config/default.ts');
      const configOriginal = readFileSync(config, 'utf8');
      writeFileSync(config, configOriginal
        .replace("import { PageStampDirective, ShoutDirective } from '../builder/directives';", "import { PageStampDirective, ShoutDirective } from '../builder/directives';\nimport { EchoDirective } from '../builder/echo';")
        .replace('customDirectives: [ShoutDirective, PageStampDirective]', 'customDirectives: [ShoutDirective, PageStampDirective, EchoDirective]'));
      await waitFor(() => page().includes('<em>echoed</em>'), 30000, 'added directive');

      // 3. The directive is removed: unregistered and deleted.
      writeFileSync(config, configOriginal);
      rmSync(echo);
      await waitFor(() => !page().includes('<em>echoed</em>') && page().includes('<!-- echo -->'), 30000, 'removed directive');

      // 4. Site code that reads a data file when it is loaded: each change of the file is picked up.
      const renderers = join(dir, 'builder/renderers.ts');
      const labels = join(dir, 'src/app/data-sources/labels.json');
      writeFileSync(labels, '{ "news": "Label zero" }');
      writeFileSync(renderers, readFileSync(renderers, 'utf8').replace("resolve(__dirname, 'labels.json')", "resolve(__dirname, '../src/app/data-sources/labels.json')"));
      await waitFor(() => page().includes('Label zero'), 30000, 'renderer reading src data');
      for (const word of ['one', 'two']) {
        writeFileSync(labels, `{ "news": "Label ${word}" }`);
        await waitFor(() => page().includes(`Label ${word}`), 30000, `data read at load time (${word})`);
      }
    } finally {
      watch.child.kill('SIGINT');
      await new Promise(resolvePromise => watch.child.once('exit', resolvePromise));
    }
  }, 180000);
});
