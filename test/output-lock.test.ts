import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { acquireOutputLock, LOCK_OWNER_ENV, lockPathFor, releaseOutputLock } from '../src/pipeline/output-lock';

const out = () => mkdtempSync(join(tmpdir(), 'yassb-out-'));
afterEach(() => {
  delete process.env[LOCK_OWNER_ENV];
});

describe('output lock', () => {
  test('is taken, refused to another process, and released', () => {
    const folder = out();
    const first = acquireOutputLock(folder, 'build');
    expect(first.ok).toBe(true);
    expect(JSON.parse(readFileSync(lockPathFor(folder), 'utf8')).command).toBe('build');

    // Another live process (the parent of this test runner) holds it.
    writeFileSync(lockPathFor(folder), JSON.stringify({ pid: process.ppid, command: 'watch', cwd: '/x', out: folder, startedAt: new Date().toISOString() }));
    const second = acquireOutputLock(folder, 'build');
    expect(second.ok).toBe(false);
    if (!second.ok)
      expect(second.holder.command).toBe('watch');

    writeFileSync(lockPathFor(folder), JSON.stringify({ pid: process.pid, command: 'build', cwd: '/x', out: folder, startedAt: '' }));
    if (first.ok)
      first.release();
    expect(existsSync(lockPathFor(folder))).toBe(false);
  });

  test('a lock left by a dead process is taken over', () => {
    const folder = out();
    writeFileSync(lockPathFor(folder), JSON.stringify({ pid: 999999, command: 'watch', cwd: '/x', out: folder, startedAt: '' }));
    const lock = acquireOutputLock(folder, 'build');
    expect(lock.ok).toBe(true);
    if (lock.ok)
      lock.release();
  });

  test('rebuilds of a watch share its lock and do not release it', () => {
    const folder = out();
    process.env[LOCK_OWNER_ENV] = String(process.ppid);
    const first = acquireOutputLock(folder, 'watch');
    const second = acquireOutputLock(folder, 'watch');
    expect(first.ok && second.ok).toBe(true);
    if (second.ok)
      second.release();
    expect(existsSync(lockPathFor(folder))).toBe(true);
    releaseOutputLock(folder, process.ppid);
    expect(existsSync(lockPathFor(folder))).toBe(false);
  });

  test('different folders never conflict', () => {
    const a = acquireOutputLock(out(), 'build');
    const b = acquireOutputLock(out(), 'build');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok)
      a.release();
    if (b.ok)
      b.release();
  });
});
