/**
 * Publishes the project website (landing/) to GitHub Pages: the repository YASSB-FOSS/YASSB-FOSS.github.io,
 * served from the root of its master branch.
 *
 *   bun run deploy-landing             build, validate, commit and push
 *   bun run deploy-landing --dry-run   same, but stop before the push and print where the commit is
 *
 * Steps: build the engine, `yassb check` the landing into a temporary folder (stops on errors), clone the Pages
 * repository into another temporary folder, replace its content with the build (keeping the files listed in
 * KEEP), commit and push. The landing output folder is not used, so this works while `bun run watch` is running.
 */
import { execFileSync } from 'child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const PAGES_REPO = 'https://github.com/YASSB-FOSS/YASSB-FOSS.github.io.git';
const BRANCH = 'master';
/** Files of the Pages repository that are not part of the build. */
const KEEP = new Set(['.git', 'README.md', 'package.json', 'CNAME']);

const root = resolve(__dirname, '..');
const landing = join(root, 'landing');
const dryRun = process.argv.includes('--dry-run');

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' }).trim();
}

function step(message: string): void {
  console.log(`\n▸ ${message}`);
}

step('Building the engine');
execFileSync('bun', ['run', 'build'], { cwd: root, stdio: 'inherit' });

step('Building and checking the landing');
const output = mkdtempSync(join(tmpdir(), 'yassb-site-'));
execFileSync('node', ['../bin.js', 'check', '--out', output], { cwd: landing, stdio: 'inherit' });

step(`Cloning ${PAGES_REPO}`);
const clone = mkdtempSync(join(tmpdir(), 'yassb-pages-'));
run('git', ['clone', '--quiet', '--depth', '1', '--branch', BRANCH, PAGES_REPO, clone], root);

step('Replacing the site');
for (const entry of readdirSync(clone))
  if (!KEEP.has(entry))
    rmSync(join(clone, entry), { recursive: true, force: true });
cpSync(output, clone, { recursive: true });
rmSync(output, { recursive: true, force: true });
// Serve folders starting with _ and skip the Jekyll build.
writeFileSync(join(clone, '.nojekyll'), '');

run('git', ['add', '-A'], clone);
if (!run('git', ['status', '--porcelain'], clone)) {
  console.log('\nThe published site is already up to date: nothing to deploy.');
  rmSync(clone, { recursive: true, force: true });
  process.exit(0);
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const sha = run('git', ['rev-parse', '--short', 'HEAD'], root);
run('git', ['commit', '--quiet', '-m', `Deploy website (yassb-web ${version}, ${sha})`], clone);
console.log(run('git', ['show', '--stat', '--format=%h %s', 'HEAD'], clone).split('\n').slice(-1)[0]);

if (dryRun) {
  console.log(`\nDry run: commit ready in ${clone}, not pushed.`);
  process.exit(0);
}

step('Pushing');
execFileSync('git', ['push', '--quiet', 'origin', BRANCH], { cwd: clone, stdio: 'inherit' });
rmSync(clone, { recursive: true, force: true });
console.log('\nDeployed: https://yassb-foss.github.io (GitHub Pages updates in a minute or two).');
