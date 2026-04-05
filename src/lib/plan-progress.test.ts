import assert from 'node:assert/strict';
import test from 'node:test';

import type { TrainingPlan } from '../types.ts';
import {
  advancePlanProgress,
  getPlanProgressSnapshot,
  isPlanComplete,
} from './plan-progress.ts';

const createPlan = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-1',
  name: 'BASE',
  durationWeeks: 4,
  currentWeek: 1,
  currentDay: 1,
  schedule: {
    MON: { type: 'workout', exercises: ['SQUAT'] },
    TUE: { type: 'rest' },
    WED: { type: 'workout', exercises: ['BENCH'] },
    THU: { type: 'rest' },
    FRI: { type: 'workout', exercises: ['DEADLIFT'] },
    SAT: { type: 'rest' },
    SUN: { type: 'rest' },
  },
  ...overrides,
});

test('advancePlanProgress stops at the first day after the configured duration', () => {
  const plan = createPlan({
    durationWeeks: 2,
    currentWeek: 2,
    currentDay: 14,
  });

  const next = advancePlanProgress(plan);

  assert.equal(next.currentDay, 15);
  assert.equal(next.currentWeek, 3);
});

test('advancePlanProgress does not progress further once the plan is complete', () => {
  const plan = createPlan({
    durationWeeks: 2,
    currentWeek: 3,
    currentDay: 15,
  });

  const next = advancePlanProgress(plan);

  assert.equal(next.currentDay, 15);
  assert.equal(next.currentWeek, 3);
});

test('getPlanProgressSnapshot clamps visible day, week, percent, and fill to the configured duration', () => {
  const plan = createPlan({
    durationWeeks: 2,
    currentWeek: 3,
    currentDay: 15,
  });

  const snapshot = getPlanProgressSnapshot(plan);

  assert.deepEqual(snapshot, {
    totalDays: 14,
    displayDay: 14,
    displayWeek: 2,
    progressPercent: 100,
    completedWeeks: 2,
    weeksRemaining: 0,
    isComplete: true,
  });
});

test('isPlanComplete flips once the stored day moves past the configured duration', () => {
  assert.equal(isPlanComplete(createPlan({ durationWeeks: 3, currentDay: 21 })), false);
  assert.equal(isPlanComplete(createPlan({ durationWeeks: 3, currentDay: 22 })), true);
});
