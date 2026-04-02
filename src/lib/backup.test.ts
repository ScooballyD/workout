import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseImportedBackupFile,
  validateImportedBackup,
} from './backup.ts';

const createValidBackup = () => ({
  version: 1,
  exportedAt: '2026-04-02T12:00:00.000Z',
  exercises: [
    {
      id: 'ex-1',
      name: 'BENCH PRESS',
      sets: 3,
      reps: '5',
      logs: [],
    },
  ],
  prs: [
    {
      exerciseId: 'ex-1',
      exerciseName: 'BENCH PRESS',
      weight: 225,
      date: '2026-04-01',
      history: [{ weight: 225, date: '2026-04-01' }],
    },
  ],
  plans: [
    {
      id: 'plan-1',
      name: 'PUSH',
      durationWeeks: 4,
      currentWeek: 1,
      currentDay: 1,
      schedule: {
        MON: {
          type: 'workout',
          exercises: ['BENCH PRESS'],
        },
      },
      advanced: {
        autoIncrement: true,
      },
    },
  ],
  activePlanId: 'plan-1',
  settings: {
    unit: 'lbs' as const,
    hapticFeedback: true,
    matchWeight: false,
  },
});

test('parseImportedBackupFile rejects malformed JSON input', () => {
  const result = parseImportedBackupFile('{not valid json');

  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE',
  });
});

test('validateImportedBackup accepts older backup shapes with omitted optional fields', () => {
  const legacyBackup = createValidBackup();
  delete legacyBackup.prs;
  delete legacyBackup.activePlanId;

  const result = validateImportedBackup(legacyBackup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.deepEqual(result.value.prs, []);
  assert.equal(result.value.activePlanId, null);
});

test('validateImportedBackup rejects malformed activePlanId values', () => {
  const backup = createValidBackup();
  backup.activePlanId = 42 as never;

  const result = validateImportedBackup(backup);

  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE: active plan is malformed',
  });
});

test('validateImportedBackup clears activePlanId values that do not match any imported plan', () => {
  const backup = createValidBackup();
  backup.activePlanId = 'missing-plan';

  const result = validateImportedBackup(backup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.equal(result.value.activePlanId, null);
});
