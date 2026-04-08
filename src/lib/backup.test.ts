import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeExercisesForStorage,
  parseStoredValue,
  parseImportedBackupFile,
  validateImportedBackup,
} from './backup.ts';

const createValidSchedule = () => ({
  MON: {
    type: 'workout' as const,
    exercises: ['BENCH PRESS'],
  },
  TUE: {
    type: 'rest' as const,
  },
  WED: {
    type: 'workout' as const,
    exercises: ['BENCH PRESS'],
  },
  THU: {
    type: 'rest' as const,
  },
  FRI: {
    type: 'workout' as const,
    exercises: ['BENCH PRESS'],
  },
  SAT: {
    type: 'rest' as const,
  },
  SUN: {
    type: 'rest' as const,
  },
});

const createValidBackup = () => ({
  version: 1,
  exportedAt: '2026-04-02T12:00:00.000Z',
  exercises: [
    {
      id: 'ex-1',
      name: 'BENCH PRESS',
      primaryMuscle: 'Chest',
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
      schedule: createValidSchedule(),
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
  delete legacyBackup.exercises[0].primaryMuscle;

  const result = validateImportedBackup(legacyBackup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.deepEqual(result.value.prs, []);
  assert.equal(result.value.activePlanId, null);
  assert.equal(result.value.exercises[0].primaryMuscle, 'Other');
  assert.equal(result.value.plans[0].deload, undefined);
});

test('validateImportedBackup preserves explicit deload plan metadata', () => {
  const backup = createValidBackup() as ReturnType<typeof createValidBackup> & {
    plans: Array<ReturnType<typeof createValidBackup>['plans'][number] & {
      deload?: {
        enabled: true;
        baseDurationWeeks: number;
      };
      exerciseSetCounts?: Record<string, number>;
    }>;
  };
  backup.plans[0].durationWeeks = 5;
  backup.plans[0].deload = {
    enabled: true,
    baseDurationWeeks: 4,
  };
  backup.plans[0].exerciseSetCounts = {
    'BENCH PRESS': 4,
  };

  const result = validateImportedBackup(backup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.deepEqual(result.value.plans[0].deload, {
    enabled: true,
    baseDurationWeeks: 4,
  });
  assert.deepEqual(result.value.plans[0].exerciseSetCounts, {
    'BENCH PRESS': 4,
  });
});

test('validateImportedBackup seeds legacy plans with the default 2-set baseline per scheduled exercise', () => {
  const backup = createValidBackup();

  const result = validateImportedBackup(backup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.deepEqual(result.value.plans[0].exerciseSetCounts, {
    'BENCH PRESS': 2,
  });
});

test('validateImportedBackup rejects plans with incomplete schedules', () => {
  const backup = createValidBackup();
  backup.plans[0].schedule = {
    MON: {
      type: 'workout',
      exercises: ['BENCH PRESS'],
    },
  } as never;

  const result = validateImportedBackup(backup);

  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE: plans are malformed',
  });
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

test('DEFAULT_SETTINGS enables matchWeight for fresh settings state', () => {
  assert.equal(DEFAULT_SETTINGS.matchWeight, true);
});

test('parseStoredValue preserves an existing saved matchWeight false preference', () => {
  const storedSettings = JSON.stringify({
    unit: 'lbs',
    hapticFeedback: true,
    matchWeight: false,
  });

  const result = parseStoredValue(
    storedSettings,
    normalizeSettings,
    DEFAULT_SETTINGS
  );

  assert.equal(result.matchWeight, false);
});

test('parseStoredValue defaults legacy stored exercises without primaryMuscle', () => {
  const storedExercises = JSON.stringify([
    {
      id: 'ex-1',
      name: 'PULL UP',
      sets: 3,
      reps: '6-8',
      logs: [],
    },
  ]);

  const result = parseStoredValue(
    storedExercises,
    normalizeExercisesForStorage,
    []
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].primaryMuscle, 'Other');
});
