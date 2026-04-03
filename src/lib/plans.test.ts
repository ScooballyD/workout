import assert from 'node:assert/strict';
import test from 'node:test';

import type { TrainingPlan } from '../types.ts';
import {
  deletePlanById,
  mergePlanEdits,
  replacePlanById,
  restartPlanProgress,
} from './plans.ts';

const createPlan = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-1',
  name: 'BASE',
  durationWeeks: 4,
  currentWeek: 2,
  currentDay: 10,
  schedule: {
    MON: { type: 'workout', exercises: ['SQUAT'] },
    TUE: { type: 'rest' },
    WED: { type: 'workout', exercises: ['BENCH'] },
    THU: { type: 'rest' },
    FRI: { type: 'workout', exercises: ['DEADLIFT'] },
    SAT: { type: 'rest' },
    SUN: { type: 'rest' },
  },
  advanced: {
    autoIncrement: true,
  },
  ...overrides,
});

test('restartPlanProgress resets progress counters without changing plan structure', () => {
  const plan = createPlan();

  const restarted = restartPlanProgress(plan);

  assert.equal(restarted.currentWeek, 1);
  assert.equal(restarted.currentDay, 1);
  assert.equal(restarted.name, plan.name);
  assert.equal(restarted.durationWeeks, plan.durationWeeks);
  assert.deepEqual(restarted.schedule, plan.schedule);
  assert.deepEqual(restarted.advanced, plan.advanced);
});

test('replacePlanById updates an existing plan in place instead of appending a duplicate', () => {
  const plans = [
    createPlan(),
    createPlan({ id: 'plan-2', name: 'PULL', currentWeek: 1, currentDay: 1 }),
  ];
  const edited = createPlan({
    id: 'plan-1',
    name: 'PUSH UPDATED',
    durationWeeks: 6,
    currentWeek: 1,
    currentDay: 1,
    schedule: {
      MON: { type: 'workout', exercises: ['PRESS'] },
      TUE: { type: 'rest' },
      WED: { type: 'workout', exercises: ['ROW'] },
      THU: { type: 'rest' },
      FRI: { type: 'rest' },
      SAT: { type: 'rest' },
      SUN: { type: 'rest' },
    },
  });

  const nextPlans = replacePlanById(plans, edited);

  assert.equal(nextPlans.length, 2);
  assert.deepEqual(nextPlans[0], edited);
  assert.equal(nextPlans[1].id, 'plan-2');
});

test('mergePlanEdits preserves progress while clamping it to the edited duration', () => {
  const existing = createPlan({
    currentWeek: 5,
    currentDay: 29,
    durationWeeks: 5,
  });
  const edited = createPlan({
    id: 'plan-1',
    name: 'SHORTER CYCLE',
    durationWeeks: 3,
    currentWeek: 1,
    currentDay: 1,
  });

  const merged = mergePlanEdits(existing, edited);

  assert.equal(merged.id, 'plan-1');
  assert.equal(merged.name, 'SHORTER CYCLE');
  assert.equal(merged.durationWeeks, 3);
  assert.equal(merged.currentDay, 21);
  assert.equal(merged.currentWeek, 3);
});

test('deletePlanById removes a non-active plan and preserves the active plan id', () => {
  const plans = [
    createPlan(),
    createPlan({ id: 'plan-2', name: 'PULL', currentWeek: 1, currentDay: 1 }),
  ];

  const result = deletePlanById(plans, 'plan-2', 'plan-1');

  assert.deepEqual(result.plans, [plans[0]]);
  assert.equal(result.activePlanId, 'plan-1');
});

test('deletePlanById clears the active plan id when the deleted plan was active', () => {
  const plans = [
    createPlan(),
    createPlan({ id: 'plan-2', name: 'PULL', currentWeek: 1, currentDay: 1 }),
  ];

  const result = deletePlanById(plans, 'plan-1', 'plan-1');

  assert.deepEqual(result.plans, [plans[1]]);
  assert.equal(result.activePlanId, null);
});
