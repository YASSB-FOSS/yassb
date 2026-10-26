/**
 * Test helpers: copy a fixture to test/.tmp and run the real CLI (`bin.js`, i.e. the compiled dist/) on it.
 */
import { spawn, spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'fs';
import { join, resolve } from 'path';

export const ROOT = resolve(import.meta.dir, '..', '..');
export const BIN = join(ROOT, 'bin.js');
const TMP = join(ROOT, 'test', '.tmp');

let counter = 0;

/** Copies `test/fixtures/<name>` to a fresh folder, with `node_modules/yassb-web` pointing to this repo. */
export function copyFixture(name: string): string {
  const target = join(TMP, `${name}-${process.pid}-${Date.now()}-${counter++}`);
  mkdirSync(TMP, { recursive: true });
  cpSync(join(ROOT, 'test', 'fixtures', name), target, { recursive: true, filter: source => !source.includes('expected-1.4.3') });
  mkdirSync(join(target, 'node_modules'), { recursive: true });
  symlinkSync(ROOT, join(target, 'node_modules', 'yassb-web'), 'dir');
  return target;
}

export function removeFixture(dir: string): void {
  if (dir.startsWith(TMP) && existsSync(dir))
    rmSync(dir, { recursive: true, force: true });
}

export type Runtime = 'node' | 'bun';

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Runs `yassb <args>` in `cwd` and waits for it. */
export function runCli(cwd: string, args: Array<string>, runtime: Runtime = 'node', env: { [key: string]: string } = {}): CliResult {
  const result = spawnSync(runtime === 'node' ? 'node' : process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: '', ...env },
    timeout: 120000
  });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

/** Starts `yassb <args>` in the background (e.g. watch). */
export function startCli(cwd: string, args: Array<string>, runtime: Runtime = 'node') {
  const child = spawn(runtime === 'node' ? 'node' : process.execPath, [BIN, ...args], {
    cwd,
    env: { ...process.env, NODE_ENV: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => output += chunk);
  child.stderr.on('data', chunk => output += chunk);
  return { child, output: () => output };
}

/** Polls `check` until it returns true (or fails after `timeoutMs`). */
export async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs: number = 20000, label: string = 'condition'): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check())
      return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
