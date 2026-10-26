import assert from 'node:assert/strict';
import test from 'node:test';

import type { Exercise, TrainingPlan } from '../types.ts';

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeExercisesForStorage,
  parseStoredValue,
  parseImportedBackupFile,
  validateImportedBackup,
} from './backup.ts';
import { DATA_LIMITS, getUtf8ByteLength } from './data-limits.ts';

const createValidSchedule = (): TrainingPlan['schedule'] => ({
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

test('DEFAULT_SETTINGS disables rest days for fresh settings state', () => {
  assert.equal(DEFAULT_SETTINGS.includeRestDays, false);
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

test('parseStoredValue defaults legacy settings without includeRestDays to false', () => {
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

  assert.equal(result.includeRestDays, false);
});

test('normalizeSettings preserves an explicit includeRestDays true preference', () => {
  const result = normalizeSettings({
    unit: 'lbs',
    hapticFeedback: true,
    matchWeight: false,
    includeRestDays: true,
  });

  assert.equal(result?.includeRestDays, true);
});

test('normalizeSettings rejects an explicitly non-boolean includeRestDays value', () => {
  const result = normalizeSettings({
    unit: 'lbs',
    hapticFeedback: true,
    matchWeight: false,
    includeRestDays: 'false',
  });

  assert.equal(result, null);
});

test('validateImportedBackup defaults legacy settings without includeRestDays to false', () => {
  const backup = createValidBackup();
  delete (backup.settings as { includeRestDays?: boolean }).includeRestDays;

  const result = validateImportedBackup(backup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.equal(result.value.settings.includeRestDays, false);
});

test('validateImportedBackup preserves an explicit includeRestDays true preference', () => {
  const backup = createValidBackup();
  (backup.settings as { includeRestDays?: boolean }).includeRestDays = true;

  const result = validateImportedBackup(backup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected import to succeed');
  }

  assert.equal(result.value.settings.includeRestDays, true);
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

const expectBackupValid = (backup: unknown) => {
  const result = validateImportedBackup(backup);
  if (result.ok === false) {
    assert.fail(result.error);
  }
};

const expectBackupInvalid = (backup: unknown) => {
  const result = validateImportedBackup(backup);
  assert.equal(result.ok, false);
};

test('validateImportedBackup enforces bounded top-level collections', () => {
  const backup = createValidBackup();

  backup.exercises = Array.from({ length: 1_000 }, (_, index) => ({
    ...backup.exercises[0],
    id: `ex-${index}`,
  }));
  expectBackupValid(backup);
  backup.exercises.push({ ...backup.exercises[0], id: 'ex-over-limit' });
  expectBackupInvalid(backup);

  const prsBackup = createValidBackup();
  prsBackup.prs = Array.from({ length: 1_000 }, (_, index) => ({
    ...prsBackup.prs[0],
    exerciseId: `ex-${index}`,
  }));
  expectBackupValid(prsBackup);
  prsBackup.prs.push({ ...prsBackup.prs[0], exerciseId: 'ex-over-limit' });
  expectBackupInvalid(prsBackup);

  const plansBackup = createValidBackup();
  plansBackup.plans = Array.from({ length: 100 }, (_, index) => ({
    ...plansBackup.plans[0],
    id: `plan-${index}`,
  }));
  expectBackupValid(plansBackup);
  plansBackup.plans.push({ ...plansBackup.plans[0], id: 'plan-over-limit' });
  expectBackupInvalid(plansBackup);
});

test('validateImportedBackup enforces exercise set and sparse log limits', () => {
  const backup = createValidBackup();
  const exercise = backup.exercises[0] as typeof backup.exercises[number] & {
    lastLogs?: Array<null | { weight: number; reps: number; completed: boolean }>;
  };
  exercise.sets = 100;
  exercise.logs = Array.from({ length: 100 }, (_, index) =>
    index === 50 ? null as never : { weight: index, reps: 5, completed: true }
  );
  exercise.lastLogs = Array.from({ length: 100 }, () => null);

  const result = validateImportedBackup(backup);
  if (result.ok === false) {
    assert.fail(result.error);
  }
  assert.equal(result.value.exercises[0].logs.length, 100);
  assert.equal(result.value.exercises[0].logs[50], undefined);

  exercise.sets = 101;
  expectBackupInvalid(backup);
  exercise.sets = 100;
  exercise.logs.push({ weight: 1, reps: 1, completed: true });
  expectBackupInvalid(backup);
});

test('validateImportedBackup requires bounded safe integer counts', () => {
  const backup = createValidBackup();
  const exercise = backup.exercises[0];

  for (const invalidSets of [1.5, Number.MAX_SAFE_INTEGER + 1]) {
    exercise.sets = invalidSets;
    expectBackupInvalid(backup);
  }

  exercise.sets = 3;
  const plan = backup.plans[0] as typeof backup.plans[number] & {
    exerciseSetCounts?: Record<string, number>;
  };
  plan.exerciseSetCounts = { 'BENCH PRESS': Number.MAX_SAFE_INTEGER + 1 };
  expectBackupInvalid(backup);
});

test('validateImportedBackup enforces identifier, text, and date lengths', () => {
  const backup = createValidBackup();
  backup.exercises[0].id = 'i'.repeat(128);
  backup.exercises[0].name = 'n'.repeat(200);
  backup.exercises[0].reps = 'r'.repeat(200);
  backup.prs[0].exerciseId = 'i'.repeat(128);
  backup.prs[0].exerciseName = 'n'.repeat(200);
  backup.prs[0].date = 'd'.repeat(64);
  backup.prs[0].history[0].date = 'd'.repeat(64);
  backup.plans[0].id = 'i'.repeat(128);
  backup.plans[0].name = 'n'.repeat(200);
  backup.activePlanId = 'i'.repeat(128);
  backup.plans[0].schedule.MON.workoutId = 'i'.repeat(128);
  backup.plans[0].schedule.MON.description = 'd'.repeat(200);
  expectBackupValid(backup);

  backup.exercises[0].id += 'i';
  expectBackupInvalid(backup);
});

test('validateImportedBackup rejects each overlong bounded string field', () => {
  const cases: Array<(backup: ReturnType<typeof createValidBackup>) => void> = [
    (backup) => { backup.exercises[0].id = 'i'.repeat(129); },
    (backup) => { backup.exercises[0].name = 'n'.repeat(201); },
    (backup) => { backup.exercises[0].reps = 'r'.repeat(201); },
    (backup) => { backup.prs[0].exerciseId = 'i'.repeat(129); },
    (backup) => { backup.prs[0].exerciseName = 'n'.repeat(201); },
    (backup) => { backup.prs[0].date = 'd'.repeat(65); },
    (backup) => { backup.prs[0].history[0].date = 'd'.repeat(65); },
    (backup) => { backup.plans[0].id = 'i'.repeat(129); },
    (backup) => { backup.plans[0].name = 'n'.repeat(201); },
    (backup) => { backup.activePlanId = 'i'.repeat(129); },
    (backup) => { backup.plans[0].schedule.MON.workoutId = 'i'.repeat(129); },
    (backup) => { backup.plans[0].schedule.MON.description = 'd'.repeat(201); },
    (backup) => { backup.plans[0].schedule.MON.exercises = ['n'.repeat(201)]; },
  ];

  for (const mutate of cases) {
    const backup = createValidBackup();
    mutate(backup);
    expectBackupInvalid(backup);
  }
});

test('validateImportedBackup bounds scheduled names, set-count keys, and PR history', () => {
  const scheduleBackup = createValidBackup();
  scheduleBackup.plans[0].schedule.MON.exercises = Array.from(
    { length: 100 },
    (_, index) => `EXERCISE ${index}`
  );
  expectBackupValid(scheduleBackup);
  scheduleBackup.plans[0].schedule.MON.exercises.push('EXERCISE 100');
  expectBackupInvalid(scheduleBackup);

  const countBackup = createValidBackup() as ReturnType<typeof createValidBackup> & {
    plans: Array<ReturnType<typeof createValidBackup>['plans'][number] & {
      exerciseSetCounts?: Record<string, number>;
    }>;
  };
  countBackup.plans[0].exerciseSetCounts = Object.fromEntries(
    Array.from({ length: 1_000 }, (_, index) => [`EXERCISE ${index}`, 100])
  );
  expectBackupValid(countBackup);
  countBackup.plans[0].exerciseSetCounts['EXERCISE 1000'] = 1;
  expectBackupInvalid(countBackup);

  const prBackup = createValidBackup();
  prBackup.prs[0].history = Array.from({ length: 60 }, (_, index) => ({
    weight: index,
    date: '2026-04-01',
  }));
  expectBackupValid(prBackup);
  prBackup.prs[0].history.push({ weight: 61, date: '2026-04-01' });
  expectBackupInvalid(prBackup);
});

test('validateImportedBackup accepts independent completed-plan sentinels at the plan-week limit', () => {
  const backup = createValidBackup();
  backup.plans[0].durationWeeks = 520;
  backup.plans[0].currentWeek = 521;
  backup.plans[0].currentDay = 3_641;
  expectBackupValid(backup);

  backup.plans[0].currentWeek = 1;
  expectBackupValid(backup);
  backup.plans[0].currentDay = 1;
  backup.plans[0].currentWeek = 521;
  expectBackupValid(backup);
});

test('validateImportedBackup rejects plan duration and progress past their bounds', () => {
  const durationBackup = createValidBackup();
  durationBackup.plans[0].durationWeeks = 521;
  expectBackupInvalid(durationBackup);

  const weekBackup = createValidBackup();
  weekBackup.plans[0].currentWeek = weekBackup.plans[0].durationWeeks + 2;
  expectBackupInvalid(weekBackup);

  const dayBackup = createValidBackup();
  dayBackup.plans[0].currentDay = dayBackup.plans[0].durationWeeks * 7 + 2;
  expectBackupInvalid(dayBackup);
});

test('validateImportedBackup keeps finite weight and reps compatibility', () => {
  const backup = createValidBackup();
  backup.exercises[0].logs = [{ weight: -12.5, reps: 0, completed: false }];
  (backup.exercises[0] as Exercise).recommended = { weight: 0, reps: -2.5 };
  backup.prs[0].weight = -1;
  backup.prs[0].history[0].weight = 0.5;
  expectBackupValid(backup);
});

test('parseImportedBackupFile rejects UTF-8 input over 2 MiB before parsing', () => {
  const oversizedMalformedJson = `{"padding":"${'é'.repeat(1_048_576)}"`;
  const result = parseImportedBackupFile(oversizedMalformedJson);

  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID BACKUP FILE: file exceeds 2 MiB limit',
  });
});

test('parseImportedBackupFile accepts valid JSON at the 2 MiB UTF-8 boundary', () => {
  const backup = createValidBackup() as ReturnType<typeof createValidBackup> & {
    padding?: string;
  };
  backup.padding = '';
  const base = JSON.stringify(backup);
  backup.padding = 'x'.repeat(2 * 1024 * 1024 - base.length);
  const raw = JSON.stringify(backup);

  assert.equal(new TextEncoder().encode(raw).byteLength, 2 * 1024 * 1024);
  expectBackupValid(JSON.parse(raw));
  assert.equal(parseImportedBackupFile(raw).ok, true);
});

test('DATA_LIMITS exposes the shared bounded-data policy', () => {
  assert.deepEqual(DATA_LIMITS, {
    maxBackupBytes: 2 * 1024 * 1024,
    maxExercises: 1_000,
    maxPrRecords: 1_000,
    maxPlans: 100,
    maxSetsPerExercise: 100,
    maxLogsPerExercise: 100,
    maxPlanWeeks: 520,
    maxScheduledExercisesPerDay: 100,
    maxPlanExerciseSetCountEntries: 1_000,
    maxPrHistoryEntries: 60,
    maxIdentifierLength: 128,
    maxTextLength: 200,
    maxDateLength: 64,
  });
  assert.equal(getUtf8ByteLength('é'), 2);
});
