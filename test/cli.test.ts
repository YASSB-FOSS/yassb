import { afterAll, describe, expect, test } from 'bun:test';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { copyFixture, removeFixture, runCli } from './helpers/fixture';

const dirs: Array<string> = [];
afterAll(() => dirs.forEach(removeFixture));

function fixture(): string {
  const dir = copyFixture('kitchen-sink');
  dirs.push(dir);
  return dir;
}

function edit(dir: string, file: string, from: string, to: string): void {
  const path = join(dir, file);
  writeFileSync(path, readFileSync(path, 'utf8').replace(from, to));
}

describe('yassb inspect', () => {
  test('describes the project without building it', () => {
    const dir = fixture();
    const result = runCli(dir, ['inspect', '--json']);
    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout);
    expect(manifest.languages).toEqual(['en', 'it']);
    expect(manifest.pages.map((page: { source: string }) => page.source)).toEqual(['src/app/pages/about/index.html', 'src/app/pages/index.html']);
    const news = manifest.dataSources.find((source: { name: string }) => source.name === 'news.json');
    expect(news.shape).toBe('array(3) of {date, title}');
    expect(news.usedBy).toEqual([{ file: 'src/app/pages/index.html', line: 19, renderer: 'newsList' }]);
    expect(manifest.customDirectives.map((directive: { name: string }) => directive.name)).toEqual(['ShoutDirective', 'PageStampDirective']);
    expect(manifest.templates[0].pages.map((page: { output: string }) => page.output)).toEqual(['dist/public/en/blog/2024/second-post.html', 'dist/public/en/blog/hello-world.html']);
    expect(manifest.i18n.missing.it).toContain('ABOUT.TITLE');
    expect(existsSync(join(dir, 'dist'))).toBe(false);
  });

  test('answers queries', () => {
    const result = runCli(fixture(), ['inspect', 'newsList']);
    expect(result.stdout).toContain('Renderer newsList');
    expect(result.stdout).toContain('src/app/pages/index.html:19');
  });
});

describe('yassb build / check', () => {
  test('a clean site builds and checks with exit code 0', () => {
    const dir = fixture();
    const result = runCli(dir, ['check', '--json']);
    const report = JSON.parse(result.stdout);
    expect(report.counts.error).toBe(0);
    expect(result.status).toBe(0);
    const codes = report.diagnostics.map((item: { code: string }) => item.code);
    expect(codes).toContain('I18N_MISSING_KEY');
    expect(codes).toContain('I18N_INCONSISTENT_KEYS');
  });

  test('a missing data source is reported with file and line; --strict fails', () => {
    const dir = fixture();
    edit(dir, 'src/app/pages/index.html', 'news.json', 'nope.json');
    const build = runCli(dir, ['build']);
    expect(build.status).toBe(0);
    expect(build.stderr).toContain('error DATA_SOURCE_NOT_FOUND src/app/pages/index.html:19');
    expect(runCli(dir, ['build', '--strict']).status).toBe(1);
    const check = runCli(dir, ['check', '--json']);
    expect(check.status).toBe(1);
  });

  test('a renderer that throws fails the build and names the directive', () => {
    const dir = fixture();
    edit(dir, 'builder/renderers.ts', 'const limit =', 'if (lang) throw new Error("renderer exploded");\n  const limit =');
    const result = runCli(dir, ['build']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RENDERER_FAILED src/app/pages/index.html:19');
    expect(result.stderr).toContain('renderer exploded');
    // Stack traces point to the TypeScript source.
    expect(result.stderr).toContain(`${join(dir, 'builder/renderers.ts')}:14`);
    // Other pages are still built.
    expect(existsSync(join(dir, 'dist/public/it/about/index.html'))).toBe(true);
  });

  test('a missing package is explained', () => {
    const dir = fixture();
    appendFileSync(join(dir, 'builder/renderers.ts'), "\nimport 'fs-extra';\n");
    const result = runCli(dir, ['build']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CONFIG_MODULE_NOT_FOUND');
    expect(result.stderr).toContain('yassb-web 1.x installed "fs-extra"');
  });

  test('--json, --out and --clean', () => {
    const dir = fixture();
    const result = runCli(dir, ['build', '--json', '--out', 'other', '--clean']);
    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.ok).toBe(true);
    expect(existsSync(join(dir, 'other/en/index.html'))).toBe(true);
  });
});

describe('yassb new / docs', () => {
  test('creates a project that builds', () => {
    const dir = fixture();
    expect(runCli(dir, ['new', 'mySite']).status).toBe(0);
    const site = join(dir, 'my-site');
    expect(existsSync(join(site, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(site, '.gitignore'))).toBe(true);
    // Resolve yassb-web from the fixture's node_modules.
    const result = runCli(site, ['build']);
    expect(result.status).toBe(0);
    expect(readFileSync(join(site, 'dist/public/index.html'), 'utf8')).toContain('<strong>Components</strong>');
  });

  test('prints the guide by topic', () => {
    const result = runCli(fixture(), ['docs', 'renderers']);
    expect(result.stdout).toStartWith('## Renderers');
  });
});
