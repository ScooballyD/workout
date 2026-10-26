import assert from 'node:assert/strict';
import test from 'node:test';

import type { ImportedBackupData } from './backup.ts';
import type { TrainingPlan } from '../types.ts';
import { DATA_LIMITS } from './data-limits.ts';
import { addExerciseToPlanDay, type PlanEditorDay } from './plan-editor.ts';
import type { WorkoutState, StorageLike } from './workout-storage.ts';
import {
  LEGACY_STORAGE_KEYS,
  WORKOUT_STATE_STORAGE_KEY,
  commitImportedWorkoutState,
  createDefaultWorkoutState,
  exportRawStoredData,
  exportWorkoutBackup,
  loadWorkoutState,
  resolveRecoveryLock,
  saveWorkoutState,
  wipeWorkoutState,
} from './workout-storage.ts';

const expectedMaxScheduleDescriptionLength =
  DATA_LIMITS.maxScheduledExercisesPerDay * DATA_LIMITS.maxTextLength +
  (DATA_LIMITS.maxScheduledExercisesPerDay - 1) * 2;

class FakeStorage implements StorageLike {
  values = new Map<string, string>();
  writes: Array<[string, string]> = [];
  removes: string[] = [];
  setError: Error | null = null;
  getError: Error | null = null;
  removeErrors = new Set<string>();

  getItem(key: string) {
    if (this.getError) throw this.getError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.writes.push([key, value]);
    if (this.setError) throw this.setError;
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.removes.push(key);
    if (this.removeErrors.has(key)) throw new Error(`remove denied: ${key}`);
    this.values.delete(key);
  }
}

const validExercise = {
  id: 'bench',
  name: 'BENCH PRESS',
  primaryMuscle: 'Chest' as const,
  sets: 3,
  reps: '5',
  logs: [undefined, { weight: 225, reps: 5, completed: true }],
};

const validImport = (): ImportedBackupData => ({
  exercises: [validExercise],
  prs: [],
  plans: [],
  activePlanId: null,
  settings: {
    unit: 'lbs',
    hapticFeedback: true,
    matchWeight: false,
    includeRestDays: false,
  },
});

const pendingState = (): WorkoutState => ({
  ...validImport(),
  drafts: {
    '["plan-a",1,"bench",0]': {
      planId: 'plan-a',
      planDay: 1,
      exerciseId: 'bench',
      setIndex: 0,
      weight: 225,
      reps: 5,
      weightSource: 'manual',
      repsSource: 'propagated',
    },
  },
});

const createMaxEditorPlan = (): TrainingPlan => {
  const workoutDay = Array.from(
    { length: DATA_LIMITS.maxScheduledExercisesPerDay },
    (_, index) => `${index}`.padEnd(DATA_LIMITS.maxTextLength, 'x')
  ).reduce<PlanEditorDay>(
    (day, exerciseName) => addExerciseToPlanDay(day, exerciseName),
    { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' }
  );

  assert.equal(workoutDay.exercises.length, DATA_LIMITS.maxScheduledExercisesPerDay);
  assert.equal(workoutDay.description.length, expectedMaxScheduleDescriptionLength);

  return {
    id: 'max-editor-plan',
    name: 'MAX EDITOR PLAN',
    durationWeeks: 4,
    currentWeek: 1,
    currentDay: 1,
    schedule: Object.fromEntries(
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => [
        day,
        day === 'MON' ? workoutDay : { type: 'rest' as const },
      ])
    ),
  };
};

const maxEditorState = (): WorkoutState => ({
  ...validImport(),
  plans: [createMaxEditorPlan()],
  activePlanId: 'max-editor-plan',
  drafts: {},
});

test('default state clones the supplied starter exercises without changing set counts', () => {
  const starters = [
    validExercise,
    { ...validExercise, id: 'row', name: 'BARBELL ROW', sets: 4 },
  ];

  const state = createDefaultWorkoutState(starters);

  assert.deepEqual(state.exercises.map((exercise) => exercise.sets), [3, 4]);
  assert.notEqual(state.exercises, starters);
  assert.notEqual(state.exercises[0].logs, starters[0].logs);
});

test('wipe persists the explicitly supplied reset state', () => {
  const storage = new FakeStorage();
  const resetState = createDefaultWorkoutState([
    { ...validExercise, sets: 2 },
  ]);

  const result = wipeWorkoutState(storage, resetState);

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('expected wipe to succeed');
  assert.deepEqual(result.state, resetState);
});

test('recovery lock survives failures and clears only after successful recovery actions', () => {
  assert.equal(resolveRecoveryLock(true, 'operation-failed'), true);
  assert.equal(resolveRecoveryLock(true, 'import-succeeded'), false);
  assert.equal(resolveRecoveryLock(true, 'overwrite-succeeded'), false);
  assert.equal(resolveRecoveryLock(true, 'wipe-succeeded'), false);
  assert.equal(resolveRecoveryLock(true, 'retry-load-succeeded'), false);
  assert.equal(resolveRecoveryLock(false, 'operation-failed'), false);
});

test('failed atomic import preserves the complete saved value and returns no replacement state', () => {
  const storage = new FakeStorage();
  storage.values.set(WORKOUT_STATE_STORAGE_KEY, 'old-complete-value');
  storage.setError = new Error('quota exceeded');

  const result = commitImportedWorkoutState(storage, validImport());

  assert.equal(result.ok, false);
  assert.equal(storage.values.get(WORKOUT_STATE_STORAGE_KEY), 'old-complete-value');
  assert.equal(storage.writes.length, 1);
});

test('successful import uses one write and returns a coherent state with cleared drafts', () => {
  const storage = new FakeStorage();

  const result = commitImportedWorkoutState(storage, validImport());

  assert.equal(result.ok, true);
  assert.equal(storage.writes.length, 1);
  if (!result.ok) throw new Error('expected import to succeed');
  assert.deepEqual(result.state, { ...validImport(), drafts: {} });
  assert.equal(loadWorkoutState(() => storage).state.exercises[0].logs[0], undefined);
});

test('legacy storage loads, preserves sparse logs, and migrates with one canonical write', () => {
  const storage = new FakeStorage();
  storage.values.set(LEGACY_STORAGE_KEYS.exercises, JSON.stringify([validExercise]));
  storage.values.set(LEGACY_STORAGE_KEYS.prs, '[]');
  storage.values.set(LEGACY_STORAGE_KEYS.plans, '[]');
  storage.values.set(LEGACY_STORAGE_KEYS.settings, JSON.stringify(validImport().settings));
  storage.values.set(LEGACY_STORAGE_KEYS.drafts, JSON.stringify({
    version: 1,
    drafts: Object.values(pendingState().drafts),
  }));

  const loaded = loadWorkoutState(() => storage);

  assert.equal(loaded.recoveryError, undefined);
  assert.equal(loaded.state.exercises[0].logs[0], undefined);
  assert.deepEqual(loaded.state.drafts, pendingState().drafts);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.values.has(LEGACY_STORAGE_KEYS.exercises), true);
});

test('canonical storage takes precedence over conflicting legacy values', () => {
  const storage = new FakeStorage();
  assert.equal(saveWorkoutState(storage, pendingState()).ok, true);
  storage.writes.length = 0;
  storage.values.set(LEGACY_STORAGE_KEYS.exercises, 'not-json');

  const loaded = loadWorkoutState(() => storage);

  assert.equal(loaded.recoveryError, undefined);
  assert.deepEqual(loaded.state, pendingState());
  assert.equal(storage.writes.length, 0);
});

test('malformed and oversized canonical text leave the original raw value unchanged', () => {
  for (const raw of ['{bad', 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    const storage = new FakeStorage();
    storage.values.set(WORKOUT_STATE_STORAGE_KEY, raw);

    const loaded = loadWorkoutState(() => storage);

    assert.match(loaded.recoveryError ?? '', /saved data/i);
    assert.equal(storage.values.get(WORKOUT_STATE_STORAGE_KEY), raw);
    assert.equal(storage.writes.length, 0);
  }
});

test('small canonical JSON with excessive collections is rejected without traversal or overwrite', () => {
  const storage = new FakeStorage();
  const raw = JSON.stringify({
    version: 1,
    ...validImport(),
    exercises: new Array(1_001),
    drafts: [],
  });
  storage.values.set(WORKOUT_STATE_STORAGE_KEY, raw);

  const loaded = loadWorkoutState(() => storage);

  assert.match(loaded.recoveryError ?? '', /saved data/i);
  assert.equal(storage.values.get(WORKOUT_STATE_STORAGE_KEY), raw);
});

test('denied storage access returns defaults and a recovery error without throwing', () => {
  const loaded = loadWorkoutState(() => {
    throw new Error('security denied');
  });

  assert.deepEqual(loaded.state, createDefaultWorkoutState());
  assert.match(loaded.recoveryError ?? '', /storage/i);
  assert.equal(loaded.storage, undefined);
});

test('denied getItem returns defaults and a recovery error without writing', () => {
  const storage = new FakeStorage();
  storage.getError = new Error('read denied');

  const loaded = loadWorkoutState(() => storage);

  assert.deepEqual(loaded.state, createDefaultWorkoutState());
  assert.match(loaded.recoveryError ?? '', /read/i);
  assert.equal(storage.writes.length, 0);
});

test('an overlong legacy active plan id is not repaired or migrated over', () => {
  const storage = new FakeStorage();
  const raw = 'x'.repeat(129);
  storage.values.set(LEGACY_STORAGE_KEYS.activePlanId, raw);

  const loaded = loadWorkoutState(() => storage);

  assert.match(loaded.recoveryError ?? '', /saved data/i);
  assert.equal(storage.values.get(LEGACY_STORAGE_KEYS.activePlanId), raw);
  assert.equal(storage.writes.length, 0);
});

test('a failed routine save can be retried with the unchanged pending state', () => {
  const storage = new FakeStorage();
  storage.setError = new Error('quota exceeded');

  assert.equal(saveWorkoutState(storage, pendingState()).ok, false);
  storage.setError = null;
  assert.equal(saveWorkoutState(storage, pendingState()).ok, true);
  assert.deepEqual(loadWorkoutState(() => storage).state, pendingState());
});

test('completed plan counters and draft source metadata survive canonical round-trip', () => {
  const state = pendingState();
  state.plans = [{
    id: 'finished',
    name: 'DONE',
    durationWeeks: 1,
    currentWeek: 2,
    currentDay: 8,
    schedule: Object.fromEntries(
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => [day, { type: 'rest' }])
    ),
  }];
  state.activePlanId = 'finished';
  const storage = new FakeStorage();

  assert.equal(saveWorkoutState(storage, state).ok, true);
  const loaded = loadWorkoutState(() => storage);

  assert.equal(loaded.state.plans[0].currentWeek, 2);
  assert.equal(loaded.state.plans[0].currentDay, 8);
  assert.equal(Object.values(loaded.state.drafts)[0].repsSource, 'propagated');
});

test('wipe persists the empty canonical state before legacy cleanup and reports cleanup failures', () => {
  const storage = new FakeStorage();
  storage.values.set(LEGACY_STORAGE_KEYS.exercises, 'legacy');
  storage.removeErrors.add(LEGACY_STORAGE_KEYS.exercises);

  const result = wipeWorkoutState(storage);

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('expected wipe to persist');
  assert.match(result.cleanupError ?? '', /cleanup/i);
  assert.deepEqual(loadWorkoutState(() => storage).state, createDefaultWorkoutState());
  assert.equal(storage.writes[0][0], WORKOUT_STATE_STORAGE_KEY);
});

test('failed wipe leaves the original canonical value untouched', () => {
  const storage = new FakeStorage();
  storage.values.set(WORKOUT_STATE_STORAGE_KEY, 'old-complete-value');
  storage.setError = new Error('write denied');

  const result = wipeWorkoutState(storage);

  assert.equal(result.ok, false);
  assert.equal(storage.values.get(WORKOUT_STATE_STORAGE_KEY), 'old-complete-value');
  assert.equal(storage.removes.length, 0);
});

test('compact export stays importable and excludes drafts', () => {
  const exported = exportWorkoutBackup(pendingState(), '2026-10-22T12:00:00.000Z');

  assert.equal(exported.ok, true);
  if (!exported.ok) throw new Error('expected export to succeed');
  const parsed = JSON.parse(exported.json);
  assert.equal('drafts' in parsed, false);
  assert.equal(parsed.version, 1);
  assert.equal(commitImportedWorkoutState(new FakeStorage(), parsed).ok, true);
});

test('an editor-produced maximum schedule saves, exports, and re-imports', () => {
  const state = maxEditorState();
  const storage = new FakeStorage();

  assert.equal(saveWorkoutState(storage, state).ok, true);
  assert.equal(
    loadWorkoutState(() => storage).state.plans[0].schedule.MON.description?.length,
    expectedMaxScheduleDescriptionLength
  );

  const exported = exportWorkoutBackup(state, '2026-10-26T12:00:00.000Z');
  assert.equal(exported.ok, true);
  if (!exported.ok) throw new Error('expected export to succeed');
  const importedStorage = new FakeStorage();
  assert.equal(
    commitImportedWorkoutState(importedStorage, JSON.parse(exported.json)).ok,
    true
  );
  assert.equal(
    loadWorkoutState(() => importedStorage).state.plans[0].schedule.MON.description?.length,
    expectedMaxScheduleDescriptionLength
  );
});

test('legacy migration preserves an editor-produced maximum schedule', () => {
  const state = maxEditorState();
  const storage = new FakeStorage();
  storage.values.set(LEGACY_STORAGE_KEYS.exercises, JSON.stringify(state.exercises));
  storage.values.set(LEGACY_STORAGE_KEYS.prs, JSON.stringify(state.prs));
  storage.values.set(LEGACY_STORAGE_KEYS.plans, JSON.stringify(state.plans));
  storage.values.set(LEGACY_STORAGE_KEYS.activePlanId, state.activePlanId ?? '');
  storage.values.set(LEGACY_STORAGE_KEYS.settings, JSON.stringify(state.settings));

  const loaded = loadWorkoutState(() => storage);

  assert.equal(loaded.recoveryError, undefined);
  assert.equal(loaded.saveError, undefined);
  assert.equal(
    loaded.state.plans[0].schedule.MON.description?.length,
    expectedMaxScheduleDescriptionLength
  );
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.values.has(LEGACY_STORAGE_KEYS.plans), true);
});

test('raw recovery export preserves malformed saved text without parsing or writing', () => {
  const storage = new FakeStorage();
  storage.values.set(WORKOUT_STATE_STORAGE_KEY, '{malformed canonical');
  storage.values.set(LEGACY_STORAGE_KEYS.settings, '{malformed legacy');

  const exported = exportRawStoredData(storage, '2026-10-22T12:00:00.000Z');

  assert.equal(exported.ok, true);
  if (!exported.ok) throw new Error('expected raw recovery export to succeed');
  const payload = JSON.parse(exported.json);
  assert.equal(payload.entries[WORKOUT_STATE_STORAGE_KEY], '{malformed canonical');
  assert.equal(payload.entries[LEGACY_STORAGE_KEYS.settings], '{malformed legacy');
  assert.equal(storage.writes.length, 0);
});

test('current-data export includes unsaved in-memory edits instead of the older stored snapshot', () => {
  const storage = new FakeStorage();
  const oldState = createDefaultWorkoutState([validExercise]);
  assert.equal(saveWorkoutState(storage, oldState).ok, true);
  const pending = pendingState();
  pending.exercises[0].name = 'UNSAVED BENCH EDIT';

  const exported = exportWorkoutBackup(pending, '2026-10-22T12:00:00.000Z');

  assert.equal(exported.ok, true);
  if (!exported.ok) throw new Error('expected pending export to succeed');
  assert.equal(JSON.parse(exported.json).exercises[0].name, 'UNSAVED BENCH EDIT');
  assert.equal(loadWorkoutState(() => storage).state.exercises[0].name, oldState.exercises[0].name);
});

test('loading can be retried after transient storage access denial', () => {
  const storage = new FakeStorage();
  assert.equal(saveWorkoutState(storage, pendingState()).ok, true);
  let denied = true;
  const getStorage = () => {
    if (denied) throw new Error('temporarily denied');
    return storage;
  };

  const first = loadWorkoutState(getStorage);
  denied = false;
  const retried = loadWorkoutState(getStorage);

  assert.match(first.recoveryError ?? '', /storage/i);
  assert.deepEqual(retried.state, pendingState());
  assert.equal(retried.recoveryError, undefined);
});
