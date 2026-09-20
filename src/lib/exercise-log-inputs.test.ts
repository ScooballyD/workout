import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyWeightChangeToInputs,
  createExerciseLogInputValues,
  hydrateExerciseLogInputValues,
  shouldPersistExerciseLogInputValue,
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

test('createExerciseLogInputValues respects each plan\'s independent set progression', () => {
  const exercise = baseExercise();
  const firstPlan: TrainingPlan = {
    id: 'plan-a',
    name: 'PUSH',
    durationWeeks: 4,
    currentWeek: 1,
    currentDay: 1,
    schedule: {
      MON: { type: 'workout', exercises: ['Bench Press'] },
    },
    exerciseSetCounts: {
      'Bench Press': 2,
    },
  };
  const secondPlan: TrainingPlan = {
    id: 'plan-b',
    name: 'PUSH B',
    durationWeeks: 4,
    currentWeek: 1,
    currentDay: 1,
    schedule: {
      MON: { type: 'workout', exercises: ['Bench Press'] },
    },
    exerciseSetCounts: {
      'Bench Press': 4,
    },
  };

  const firstPlanInputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
    plan: firstPlan,
  });
  const secondPlanInputs = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
    plan: secondPlan,
  });

  assert.equal(firstPlanInputs.length, 2);
  assert.equal(secondPlanInputs.length, 4);
});

test('hydrateExerciseLogInputValues restores saved values and source metadata for unfinished sets', () => {
  const exercise = baseExercise();
  const generated = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  const hydrated = hydrateExerciseLogInputValues(generated, exercise, [
    {
      weight: 205,
      reps: 7,
      weightSource: 'manual',
      repsSource: 'manual',
    },
    {
      weight: 205,
      reps: 5,
      weightSource: 'propagated',
      repsSource: 'default',
    },
  ]);

  assert.deepEqual(hydrated[0], {
    weight: 205,
    reps: 7,
    weightSource: 'manual',
    repsSource: 'manual',
  });
  assert.deepEqual(hydrated[1], {
    weight: 205,
    reps: 5,
    weightSource: 'propagated',
    repsSource: 'default',
  });
  assert.deepEqual(hydrated[2], generated[2]);
});

test('hydrateExerciseLogInputValues keeps completed logs authoritative over saved drafts', () => {
  const exercise = {
    ...baseExercise(),
    logs: [{ weight: 195, reps: 4, completed: true }, undefined, undefined],
  };
  const generated = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  const hydrated = hydrateExerciseLogInputValues(generated, exercise, [
    {
      weight: 225,
      reps: 10,
      weightSource: 'propagated',
      repsSource: 'manual',
    },
  ]);

  assert.deepEqual(hydrated[0], {
    weight: 195,
    reps: 4,
    weightSource: 'manual',
    repsSource: 'manual',
  });
});

test('hydrateExerciseLogInputValues ignores drafts beyond the generated deload set count', () => {
  const exercise = {
    ...baseExercise(),
    sets: 5,
    logs: [],
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
  const generated = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 5,
    plan,
  });
  const drafts = Array.from({ length: 5 }, (_, index) => ({
    weight: 150 + index,
    reps: 5,
    weightSource: 'manual' as const,
    repsSource: 'manual' as const,
  }));

  const hydrated = hydrateExerciseLogInputValues(generated, exercise, drafts);

  assert.equal(hydrated.length, 4);
  assert.deepEqual(
    hydrated.map((input) => input.weight),
    [150, 151, 152, 153]
  );
});

test('shouldPersistExerciseLogInputValue excludes untouched defaults', () => {
  assert.equal(
    shouldPersistExerciseLogInputValue({
      weight: 185,
      reps: 5,
      weightSource: 'default',
      repsSource: 'default',
    }),
    false
  );
  assert.equal(
    shouldPersistExerciseLogInputValue({
      weight: 205,
      reps: 5,
      weightSource: 'manual',
      repsSource: 'default',
    }),
    true
  );
  assert.equal(
    shouldPersistExerciseLogInputValue({
      weight: 205,
      reps: 5,
      weightSource: 'propagated',
      repsSource: 'default',
    }),
    true
  );
});

test('hydrateExerciseLogInputValues recomputes default-sourced fields from changed generated defaults', () => {
  const exercise = baseExercise();
  const generated = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });
  generated[0] = {
    ...generated[0],
    weight: 190,
    reps: 8,
  };

  const hydrated = hydrateExerciseLogInputValues(generated, exercise, [
    {
      weight: 205,
      reps: 5,
      weightSource: 'manual',
      repsSource: 'default',
    },
  ]);

  assert.deepEqual(hydrated[0], {
    weight: 205,
    reps: 8,
    weightSource: 'manual',
    repsSource: 'default',
  });
});

test('hydration retains match-weight propagation while refreshing default reps', () => {
  const exercise = baseExercise();
  const initial = createExerciseLogInputValues(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });
  const propagated = applyWeightChangeToInputs(initial, exercise, 0, 205, true);
  const changedDefaults = initial.map((value) => ({ ...value, reps: 8 }));

  const hydrated = hydrateExerciseLogInputValues(
    changedDefaults,
    exercise,
    propagated
  );

  assert.deepEqual(
    hydrated.map(({ weight, reps, weightSource, repsSource }) => ({
      weight,
      reps,
      weightSource,
      repsSource,
    })),
    [
      { weight: 205, reps: 8, weightSource: 'manual', repsSource: 'default' },
      { weight: 205, reps: 8, weightSource: 'propagated', repsSource: 'default' },
      { weight: 205, reps: 8, weightSource: 'propagated', repsSource: 'default' },
    ]
  );
});
