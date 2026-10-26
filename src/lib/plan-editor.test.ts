import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addExerciseToPlanDay,
  buildPlanExerciseDraft,
  getPlanExerciseAdditionError,
  getPlanExerciseSuggestions,
  removeExerciseFromPlanDay,
  type PlanEditorDay,
} from './plan-editor.ts';
import { DATA_LIMITS } from './data-limits.ts';

test('addExerciseToPlanDay appends a normalized manual entry and updates the description', () => {
  const next = addExerciseToPlanDay(
    { type: 'workout', exercises: ['SQUAT'], description: 'SQUAT' },
    ' bench press '
  );

  assert.deepEqual(next, {
    type: 'workout',
    exercises: ['SQUAT', 'BENCH PRESS'],
    description: 'SQUAT, BENCH PRESS',
  });
});

test('addExerciseToPlanDay accepts an autocomplete suggestion value without extra input state changes', () => {
  const next = addExerciseToPlanDay(
    { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
    'Romanian Deadlift'
  );

  assert.deepEqual(next, {
    type: 'workout',
    exercises: ['ROMANIAN DEADLIFT'],
    description: 'ROMANIAN DEADLIFT',
  });
});

test('getPlanExerciseSuggestions excludes the exact match while returning partial matches', () => {
  const suggestions = getPlanExerciseSuggestions(
    [
      { name: 'Bench Press', primaryMuscle: 'Chest' },
      { name: 'Close Grip Bench', primaryMuscle: 'Triceps' },
      { name: 'Squat', primaryMuscle: 'Quads' },
    ],
    'bench'
  );

  assert.deepEqual(suggestions, [
    { name: 'Bench Press', primaryMuscle: 'Chest' },
    { name: 'Close Grip Bench', primaryMuscle: 'Triceps' },
  ]);
});

test('removeExerciseFromPlanDay keeps the description in sync after removing a chip', () => {
  const next = removeExerciseFromPlanDay(
    {
      type: 'workout',
      exercises: ['SQUAT', 'BENCH'],
      description: 'SQUAT, BENCH',
    },
    0
  );

  assert.deepEqual(next, {
    type: 'workout',
    exercises: ['BENCH'],
    description: 'BENCH',
  });
});

test('buildPlanExerciseDraft uses the selected tag for a new manual exercise', () => {
  const draft = buildPlanExerciseDraft([], ' Cable Fly ', 'Chest');

  assert.deepEqual(draft, {
    name: 'CABLE FLY',
    primaryMuscle: 'Chest',
  });
});

test('buildPlanExerciseDraft reuses the stored tag for an exact existing exercise match', () => {
  const draft = buildPlanExerciseDraft(
    [
      { name: 'Bench Press', primaryMuscle: 'Chest' },
      { name: 'Barbell Row', primaryMuscle: 'Back' },
    ],
    ' bench press ',
    'Triceps'
  );

  assert.deepEqual(draft, {
    name: 'BENCH PRESS',
    primaryMuscle: 'Chest',
  });
});

test('buildPlanExerciseDraft falls back to Other when no tag is provided', () => {
  const draft = buildPlanExerciseDraft([], 'Ab Wheel');

  assert.deepEqual(draft, {
    name: 'AB WHEEL',
    primaryMuscle: 'Other',
  });
});

test('editor accepts a 200-character normalized name and rejects 201 characters without mutation', () => {
  const day: PlanEditorDay = {
    type: 'workout',
    exercises: [],
    description: 'ASSIGN ROUTINE',
  };
  const acceptedName = 'a'.repeat(DATA_LIMITS.maxTextLength);
  const accepted = addExerciseToPlanDay(day, acceptedName);

  assert.equal(accepted.exercises[0].length, DATA_LIMITS.maxTextLength);

  const rejectedName = 'a'.repeat(DATA_LIMITS.maxTextLength + 1);
  assert.match(getPlanExerciseAdditionError(day, rejectedName) ?? '', /200/);
  assert.equal(addExerciseToPlanDay(day, rejectedName), day);
  assert.equal(buildPlanExerciseDraft([], rejectedName), null);
});

test('editor validates the normalized name after uppercase expansion', () => {
  const day: PlanEditorDay = {
    type: 'workout',
    exercises: [],
    description: 'ASSIGN ROUTINE',
  };
  const expandsPastLimit = `${'a'.repeat(DATA_LIMITS.maxTextLength - 1)}ß`;

  assert.equal(expandsPastLimit.length, DATA_LIMITS.maxTextLength);
  assert.equal(expandsPastLimit.toUpperCase().length, DATA_LIMITS.maxTextLength + 1);
  assert.match(getPlanExerciseAdditionError(day, expandsPastLimit) ?? '', /200/);
  assert.equal(addExerciseToPlanDay(day, expandsPastLimit), day);
  assert.equal(buildPlanExerciseDraft([], expandsPastLimit), null);
});

test('editor accepts the 100th exercise and rejects the 101st without mutation', () => {
  const day = {
    type: 'workout' as const,
    exercises: Array.from(
      { length: DATA_LIMITS.maxScheduledExercisesPerDay - 1 },
      (_, index) => `EXERCISE ${index}`
    ),
    description: 'existing description',
  };
  const atLimit = addExerciseToPlanDay(day, 'EXERCISE 99');

  assert.equal(atLimit.exercises.length, DATA_LIMITS.maxScheduledExercisesPerDay);
  assert.match(getPlanExerciseAdditionError(atLimit, 'EXERCISE 100') ?? '', /100/);
  assert.equal(addExerciseToPlanDay(atLimit, 'EXERCISE 100'), atLimit);
});
