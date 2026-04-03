import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

type PackageJson = {
  overrides?: Record<string, unknown>;
};

type Lockfile = {
  packages?: Record<string, { version?: string }>;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJsonFile<T>(relativePath: string): T {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

test('package manager hardening pins the patched terser chain used by workbox-build', () => {
  const packageJson = readJsonFile<PackageJson>('package.json');
  const lockfile = readJsonFile<Lockfile>('package-lock.json');

  assert.deepEqual(packageJson.overrides, {
    'workbox-build': {
      '@rollup/plugin-terser': '1.0.0',
    },
  });

  assert.equal(lockfile.packages?.['node_modules/@rollup/plugin-terser']?.version, '1.0.0');
  assert.equal(lockfile.packages?.['node_modules/serialize-javascript']?.version, '7.0.5');
});
