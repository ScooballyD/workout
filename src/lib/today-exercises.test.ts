import assert from 'node:assert/strict';
import test from 'node:test';

import type { Exercise } from '../types.ts';
import { buildTodayExercises } from './today-exercises.ts';

const createExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'BENCH PRESS',
  primaryMuscle: 'Chest',
  sets: 3,
  reps: '5',
  logs: [],
  ...overrides,
});

test('buildTodayExercises deduplicates repeated scheduled names while preserving first occurrence order', () => {
  const exercises = [
    createExercise({ id: 'bench', name: 'BENCH PRESS' }),
    createExercise({ id: 'row', name: 'BARBELL ROW', primaryMuscle: 'Back' }),
  ];

  const todayExercises = buildTodayExercises(
    ['BENCH PRESS', 'BENCH PRESS', 'BARBELL ROW', 'BENCH PRESS'],
    exercises
  );

  assert.deepEqual(todayExercises, [exercises[0], exercises[1]]);
});

test('buildTodayExercises still skips missing exercise records safely', () => {
  const exercises = [
    createExercise({ id: 'bench', name: 'BENCH PRESS' }),
  ];

  const todayExercises = buildTodayExercises(
    ['MISSING EXERCISE', 'BENCH PRESS', 'BENCH PRESS'],
    exercises
  );

  assert.deepEqual(todayExercises, [exercises[0]]);
});
