import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyWeightChangeToInputs,
  createExerciseLogInputValues,
  syncExerciseLogInputValues,
} from './exercise-log-inputs.ts';
import type { Exercise, TrainingPlan } from '../types.ts';

const baseExercise = (): Exercise => ({
  id: 'bench',
  name: 'Bench Press',
  primaryMuscle: 'Chest',
  sets: 3,
  reps: '5',
  logs: [undefined, undefined, undefined],
  lastLogs: [
    { weight: 185, reps: 5, completed: true },
    { weight: 185, reps: 5, completed: true },
    { weight: 185, reps: 5, completed: true },
  ],
  recommended: {
    weight: 135,
    reps: 5,
  },
});

test('syncExerciseLogInputValues keeps propagated weights after logging an earlier set', () => {
  const exercise = baseExercise();
  const initialInputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  const propagatedInputs = applyWeightChangeToInputs(initialInputs, exercise, 0, 200, true);

  const afterLog = {
    ...exercise,
    logs: [{ weight: 200, reps: 5, completed: true }, undefined, undefined],
  };

  const syncedInputs = syncExerciseLogInputValues(propagatedInputs, afterLog, {
    autoIncrement: false,
    currentWeek: 1,
  });

  assert.deepEqual(
    syncedInputs.map((input) => input.weight),
    [200, 200, 200]
  );
  assert.deepEqual(
    syncedInputs.map((input) => input.weightSource),
    ['manual', 'propagated', 'propagated']
  );
});

test('applyWeightChangeToInputs does not modify completed sets or manually overridden later sets', () => {
  const exercise = {
    ...baseExercise(),
    logs: [undefined, { weight: 185, reps: 5, completed: true }, undefined],
  };

  const initialInputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });
  const withManualLaterWeight = applyWeightChangeToInputs(initialInputs, exercise, 2, 225, false);
  const propagatedInputs = applyWeightChangeToInputs(withManualLaterWeight, exercise, 0, 205, true);

  assert.deepEqual(
    propagatedInputs.map((input) => input.weight),
    [205, 185, 225]
  );
  assert.deepEqual(
    propagatedInputs.map((input) => input.weightSource),
    ['manual', 'default', 'manual']
  );
});

test('applyWeightChangeToInputs keeps set editing independent when match weight is off', () => {
  const exercise = baseExercise();
  const initialInputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  const updatedInputs = applyWeightChangeToInputs(initialInputs, exercise, 0, 195, false);

  assert.deepEqual(
    updatedInputs.map((input) => input.weight),
    [195, 185, 185]
  );
  assert.deepEqual(
    updatedInputs.map((input) => input.weightSource),
    ['manual', 'default', 'default']
  );
});

test('createExerciseLogInputValues shortens the final deload week to the rounded-up reduced set count', () => {
  const exercise = {
    ...baseExercise(),
    sets: 5,
    logs: [undefined, undefined, undefined, undefined, undefined],
    lastLogs: [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
  };
  const plan: TrainingPlan = {
    id: 'plan-1',
    name: 'BASE',
    durationWeeks: 5,
    currentWeek: 5,
    currentDay: 29,
    schedule: {
      MON: { type: 'workout', exercises: ['Bench Press'] },
    },
    deload: {
      enabled: true,
      baseDurationWeeks: 4,
    },
  };

  const inputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 5,
    plan,
  });

  assert.equal(inputs.length, 4);
  assert.deepEqual(
    inputs.map((input) => input.weight),
    [138.75, 138.75, 138.75, 138.75]
  );
});
