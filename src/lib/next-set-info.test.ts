import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextSetDisplayValues, getNextSetInfo } from './next-set-info.ts';
import type { Exercise, TrainingPlan } from '../types.ts';

test('getNextSetInfo keeps the set index null when every set is complete', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 3,
    reps: '5',
    logs: [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    lastLogs: [
      { weight: 205, reps: 6, completed: true },
      { weight: 210, reps: 5, completed: true },
      { weight: 215, reps: 4, completed: true },
    ],
    recommended: {
      weight: 135,
      reps: 5,
    },
  };

  const nextSetInfo = getNextSetInfo(exercise, {
    autoIncrement: true,
    currentWeek: 2,
  });

  assert.deepEqual(nextSetInfo, {
    actualSetIndex: null,
    defaultWeight: 135,
    defaultReps: 6,
  });
});

test('getNextSetInfo applies deload weight on the final week without whole-number rounding', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 5,
    reps: '5',
    logs: [
      { weight: 155, reps: 5, completed: true },
      { weight: 155, reps: 5, completed: true },
      { weight: 155, reps: 5, completed: true },
      undefined,
      undefined,
    ],
    lastLogs: [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    recommended: {
      weight: 185,
      reps: 5,
    },
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

  const nextSetInfo = getNextSetInfo(exercise, {
    autoIncrement: false,
    currentWeek: 5,
    plan,
  });

  assert.deepEqual(nextSetInfo, {
    actualSetIndex: 3,
    defaultWeight: 138.75,
    defaultReps: 5,
  });
});

test('getNextSetDisplayValues returns dashes once an exercise is complete', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 2,
    reps: '5',
    logs: [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    lastLogs: [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    recommended: {
      weight: 135,
      reps: 5,
    },
  };

  const displayValues = getNextSetDisplayValues(exercise, {
    autoIncrement: true,
    currentWeek: 3,
    unit: 'lbs',
  });

  assert.deepEqual(displayValues, {
    weight: '-',
    reps: '-',
  });
});
