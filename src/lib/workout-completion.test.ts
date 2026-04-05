import assert from 'node:assert/strict';
import test from 'node:test';

import type { Exercise } from '../types.ts';
import { completeWorkoutExercises } from './workout-completion.ts';

const createExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'BENCH PRESS',
  primaryMuscle: 'Chest',
  sets: 3,
  reps: '5',
  logs: [],
  ...overrides,
});

test('completeWorkoutExercises only clears logs for exercises assigned to the completed day', () => {
  const todayLog = { weight: 225, reps: 5, completed: true };
  const carryOverLog = { weight: 315, reps: 3, completed: true };

  const exercises: Exercise[] = [
    createExercise({
      id: 'bench',
      name: 'BENCH PRESS',
      logs: [todayLog],
    }),
    createExercise({
      id: 'squat',
      name: 'SQUAT',
      logs: [carryOverLog],
      lastLogs: [{ weight: 275, reps: 5, completed: true }],
    }),
  ];

  const completed = completeWorkoutExercises(exercises, ['BENCH PRESS']);

  assert.deepEqual(completed[0], {
    ...exercises[0],
    lastLogs: [todayLog],
    logs: [],
  });
  assert.deepEqual(completed[1], exercises[1]);
});
