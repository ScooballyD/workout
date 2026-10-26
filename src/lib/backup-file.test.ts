import assert from 'node:assert/strict';
import test from 'node:test';

import { readImportedBackupFile } from './backup-file.ts';
import { DATA_LIMITS } from './data-limits.ts';

const validBackupJson = JSON.stringify({
  version: 1,
  exercises: [],
  plans: [],
  settings: {
    unit: 'lbs',
    hapticFeedback: true,
    matchWeight: true,
  },
});

test('readImportedBackupFile rejects an oversized file before invoking the reader', async () => {
  let readCalls = 0;
  const result = await readImportedBackupFile(
    { size: DATA_LIMITS.maxBackupBytes + 1 },
    async () => {
      readCalls += 1;
      return validBackupJson;
    }
  );

  assert.equal(readCalls, 0);
  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE: file exceeds 2 MiB limit',
  });
});

test('readImportedBackupFile parses text returned by the injected reader', async () => {
  const result = await readImportedBackupFile(
    { size: validBackupJson.length },
    async () => validBackupJson
  );

  assert.equal(result.ok, true);
});

test('readImportedBackupFile rejects invalid file sizes before invoking the reader', async () => {
  for (const size of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    let readCalls = 0;
    const result = await readImportedBackupFile({ size }, async () => {
      readCalls += 1;
      return validBackupJson;
    });

    assert.equal(readCalls, 0);
    assert.deepEqual(result, {
      ok: false,
      error: 'INVALID BACKUP FILE: file size is invalid',
    });
  }
});

test('readImportedBackupFile reports reader failures clearly', async () => {
  const result = await readImportedBackupFile({ size: 10 }, async () => {
    throw new Error('disk read failed');
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'BACKUP FILE READ FAILED: disk read failed',
  });
});

test('readImportedBackupFile reports reader aborts clearly', async () => {
  const result = await readImportedBackupFile({ size: 10 }, async () => {
    throw new DOMException('The read was aborted.', 'AbortError');
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'BACKUP FILE READ ABORTED',
  });
});

test('readImportedBackupFile rechecks actual UTF-8 text bytes after reading', async () => {
  let readCalls = 0;
  const result = await readImportedBackupFile(
    { size: DATA_LIMITS.maxBackupBytes },
    async () => {
      readCalls += 1;
      return `{"padding":"${'é'.repeat(1_048_576)}"}`;
    }
  );

  assert.equal(readCalls, 1);
  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE: file exceeds 2 MiB limit',
  });
});
