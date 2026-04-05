import assert from 'node:assert/strict';
import test from 'node:test';

import type { TrainingPlan } from '../types.ts';
import {
  applyDeloadWeight,
  getDeloadSetCount,
  getPlanExerciseSetCount,
  isDeloadWeek,
} from './deload.ts';

const createPlan = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-1',
  name: 'BASE',
  durationWeeks: 5,
  currentWeek: 1,
  currentDay: 1,
  schedule: {
    MON: { type: 'workout', exercises: ['BENCH'] },
  },
  deload: {
    enabled: true,
    baseDurationWeeks: 4,
  },
  ...overrides,
});

test('getDeloadSetCount rounds the reduced working set total up', () => {
  assert.equal(getDeloadSetCount(3), 3);
  assert.equal(getDeloadSetCount(5), 4);
});

test('applyDeloadWeight preserves decimals instead of rounding to a whole number', () => {
  assert.equal(applyDeloadWeight(102.5), 76.875);
});

test('isDeloadWeek only activates on the final stored week of a deload plan', () => {
  const deloadPlan = createPlan();

  assert.equal(isDeloadWeek(deloadPlan, 4), false);
  assert.equal(isDeloadWeek(deloadPlan, 5), true);
  assert.equal(
    isDeloadWeek(
      createPlan({
        durationWeeks: 4,
        deload: undefined,
      }),
      4
    ),
    false
  );
});

test('getPlanExerciseSetCount uses the plan-local set count instead of the shared exercise baseline', () => {
  const exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest' as const,
    sets: 2,
    reps: '5',
    logs: [],
  };

  const firstPlan = createPlan({
    id: 'plan-a',
    exerciseSetCounts: {
      'Bench Press': 2,
    },
  });
  const secondPlan = createPlan({
    id: 'plan-b',
    exerciseSetCounts: {
      'Bench Press': 4,
    },
  });

  assert.equal(getPlanExerciseSetCount(exercise, firstPlan, 1), 2);
  assert.equal(getPlanExerciseSetCount(exercise, secondPlan, 1), 4);
});
