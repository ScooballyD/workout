import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addExerciseToPlanDay,
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
    ['Bench Press', 'Close Grip Bench', 'Squat'],
    'bench'
  );

  assert.deepEqual(suggestions, ['Bench Press', 'Close Grip Bench']);
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
