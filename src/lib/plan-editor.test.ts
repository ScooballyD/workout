import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addExerciseToPlanDay,
  buildPlanExerciseDraft,
  getPlanExerciseSuggestions,
  removeExerciseFromPlanDay,
} from './plan-editor.ts';

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
