import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { copyFixture, removeFixture, ROOT, runCli } from './helpers/fixture';

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
    // Without flags: the Sass + TypeScript starter, no extra packages.
    expect(readdirSync(join(site, 'src/app/styles'))).toEqual(['styles.scss']);
    expect(Object.keys(JSON.parse(readFileSync(join(site, 'package.json'), 'utf8')).devDependencies)).toEqual(['@types/node', 'yassb-web']);
    const agents = readFileSync(join(site, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('- Styles: Sass.');
    expect(agents).toContain('- Scripts: TypeScript.');
    expect(agents).not.toContain('SETUP_NOTES');
    expect(readFileSync(join(site, 'config/default.ts'), 'utf8')).not.toContain('PRESET_OPTIONS');
  });

  // Each styles preset with Alpine, built for real. The packages are devDependencies of this repository; the
  // site's node_modules points to them, as after `npm install` (Sass resolves node_modules/ from the site).
  for (const styles of ['sass', 'tailwind', 'css', 'bootstrap', 'pico'])
    test(`--styles ${styles} --scripts alpine builds`, () => {
      const dir = fixture();
      expect(runCli(dir, ['new', 'site', '--styles', styles, '--scripts', 'alpine']).status).toBe(0);
      const site = join(dir, 'site');
      symlinkSync(join(ROOT, 'node_modules'), join(site, 'node_modules'), 'dir');
      expect(readdirSync(join(site, 'src/app/styles'))).toHaveLength(1);
      const typecheck = spawnSync(join(ROOT, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], { cwd: site, encoding: 'utf8' });
      expect(typecheck.stdout).toBe('');
      const result = runCli(site, ['check']);
      expect(result.stdout + result.stderr).toContain('0 errors');
      expect(result.status).toBe(0);
      expect(readFileSync(join(site, 'dist/public/index.html'), 'utf8')).toContain('<strong>Components</strong>');
      const css = readFileSync(join(site, 'dist/public/assets/css/styles-0-0-1.min.css'), 'utf8');
      expect(css.length).toBeGreaterThan(100);
      if (styles === 'tailwind')
        expect(css).toContain('max-w-3xl');
      expect(readFileSync(join(site, 'dist/public/assets/js/main-0-0-1.min.js'), 'utf8')).toContain('alpine:init');
      const pkg = JSON.parse(readFileSync(join(site, 'package.json'), 'utf8'));
      expect(pkg.devDependencies.alpinejs).toBeDefined();
    });

  test('--deploy adds the deploy files', () => {
    const dir = fixture();
    expect(runCli(dir, ['new', 'pages', '--deploy', 'github-pages']).status).toBe(0);
    expect(readFileSync(join(dir, 'pages/.github/workflows/deploy.yml'), 'utf8')).toContain('path: dist/public');
    expect(readFileSync(join(dir, 'pages/AGENTS.md'), 'utf8')).toContain('- Deploy: GitHub Pages.');
    // github-pages turns relativeUrls on, so the site also works under /<repository>/.
    expect(readFileSync(join(dir, 'pages/config/default.ts'), 'utf8')).toContain('  // From the github-pages preset (see AGENTS.md → Setup).\n  relativeUrls: true,\n');
    expect(runCli(join(dir, 'pages'), ['build']).status).toBe(0);
    const index = readFileSync(join(dir, 'pages/dist/public/index.html'), 'utf8');
    expect(index).toContain('href="assets/css/styles-0-0-1.min.css"');
    expect(index).toContain('src="assets/js/main-0-0-1.min.js"');
    expect(runCli(dir, ['new', 'netlify', '--deploy', 'netlify']).status).toBe(0);
    expect(readFileSync(join(dir, 'netlify/netlify.toml'), 'utf8')).toContain('publish = "dist/public"');
  });

  test('an unknown preset is refused before anything is written', () => {
    const dir = fixture();
    const result = runCli(dir, ['new', 'site', '--styles', 'nope']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--styles "nope" is not a preset. Available: bootstrap, css, pico, sass, tailwind.');
    expect(existsSync(join(dir, 'site'))).toBe(false);
    expect(runCli(dir, ['new', 'site', '--deploy']).stderr).toContain('--deploy needs a value');
  });

  test('presets never write the same file as another layer', () => {
    const files = (root: string, dir: string = root): Array<string> => readdirSync(dir).flatMap(entry => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory())
        return files(root, path);
      return path === join(root, 'preset.json') ? [] : [path.slice(root.length + 1)];
    });
    const templates = join(ROOT, 'templates');
    const base = new Set(files(join(templates, 'base')));
    const layers: { [axis: string]: Array<Set<string>> } = {};
    for (const axis of ['styles', 'scripts', 'deploy'])
      layers[axis] = readdirSync(join(templates, axis)).map(name => new Set(files(join(templates, axis, name))));
    // Every file of an axis must be absent from the base and from every other axis.
    for (const [axis, sets] of Object.entries(layers))
      for (const set of sets)
        for (const file of set) {
          expect(base.has(file)).toBe(false);
          for (const [other, otherSets] of Object.entries(layers))
            if (other !== axis)
              expect(otherSets.some(otherSet => otherSet.has(file))).toBe(false);
        }
  });

  test('prints the guide by topic', () => {
    const result = runCli(fixture(), ['docs', 'renderers']);
    expect(result.stdout).toStartWith('## Renderers');
  });
});
