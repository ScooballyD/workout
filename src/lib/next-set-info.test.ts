import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNextSetDisplayValues,
  getNextSetInfo,
  resolveNextSetValues,
} from './next-set-info.ts';
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

test('getNextSetInfo rounds generated target weights to the nearest quarter pound', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 3,
    reps: '5',
    logs: [],
    recommended: {
      weight: 135.13,
      reps: 5,
    },
  };

  const nextSetInfo = getNextSetInfo(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  assert.equal(nextSetInfo.defaultWeight, 135.25);
});

test('getNextSetInfo rounds generated target weights to the nearest quarter kilogram', () => {
  const exercise: Exercise = {
    id: 'row',
    name: 'Barbell Row',
    primaryMuscle: 'Back',
    sets: 3,
    reps: '8',
    logs: [],
    recommended: {
      weight: 72.37,
      reps: 8,
    },
  };

  const nextSetInfo = getNextSetInfo(exercise, {
    autoIncrement: false,
    currentWeek: 1,
  });

  assert.equal(nextSetInfo.defaultWeight, 72.25);
});

test('resolveNextSetValues keeps the rounded deload weight for a reps-only draft', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 3,
    reps: '5',
    logs: [],
    recommended: { weight: 185.13, reps: 5 },
  };
  const plan: TrainingPlan = {
    id: 'plan-1',
    name: 'BASE',
    durationWeeks: 5,
    currentWeek: 5,
    currentDay: 29,
    schedule: { MON: { type: 'workout', exercises: ['Bench Press'] } },
    deload: { enabled: true, baseDurationWeeks: 4 },
  };
  const generated = getNextSetInfo(exercise, {
    autoIncrement: false,
    currentWeek: 5,
    plan,
  });

  const resolved = resolveNextSetValues(generated, {
    weight: 999,
    reps: 7,
    weightSource: 'default',
    repsSource: 'manual',
  });

  assert.deepEqual(resolved, { weight: 138.75, reps: 7 });
});

test('resolveNextSetValues keeps deload defaults for a weight-only draft', () => {
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    primaryMuscle: 'Chest',
    sets: 5,
    reps: '5',
    logs: [],
    recommended: { weight: 185, reps: 5 },
  };
  const plan: TrainingPlan = {
    id: 'plan-1',
    name: 'BASE',
    durationWeeks: 5,
    currentWeek: 5,
    currentDay: 29,
    schedule: { MON: { type: 'workout', exercises: ['Bench Press'] } },
    deload: { enabled: true, baseDurationWeeks: 4 },
  };
  const generated = getNextSetInfo(exercise, {
    autoIncrement: false,
    currentWeek: 5,
    plan,
  });

  const resolved = resolveNextSetValues(generated, {
    weight: 150,
    reps: 99,
    weightSource: 'manual',
    repsSource: 'default',
  });

  assert.deepEqual(resolved, { weight: 150, reps: 5 });
});
