import assert from 'node:assert/strict';
import test from 'node:test';

import type { Exercise, PR, TrainingPlan } from '../types.ts';
import {
  deleteManagedExercise,
  saveManagedExerciseEdits,
} from './exercise-management.ts';

const createExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'BENCH PRESS',
  primaryMuscle: 'Chest',
  sets: 2,
  reps: '5',
  logs: [],
  ...overrides,
});

const createPlan = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-1',
  name: 'BASE',
  durationWeeks: 4,
  currentWeek: 1,
  currentDay: 1,
  exerciseSetCounts: {
    'BENCH PRESS': 3,
    SQUAT: 4,
  },
  schedule: {
    MON: { type: 'workout', exercises: ['BENCH PRESS', 'SQUAT'] },
    TUE: { type: 'rest', description: 'REST DAY' },
    WED: { type: 'rest', description: 'REST DAY' },
    THU: { type: 'rest', description: 'REST DAY' },
    FRI: { type: 'rest', description: 'REST DAY' },
    SAT: { type: 'rest', description: 'REST DAY' },
    SUN: { type: 'rest', description: 'REST DAY' },
  },
  ...overrides,
});

const createPr = (overrides: Partial<PR> = {}): PR => ({
  exerciseId: 'exercise-1',
  exerciseName: 'BENCH PRESS',
  weight: 225,
  date: '2026-04-01',
  history: [{ weight: 225, date: '2026-04-01' }],
  ...overrides,
});

test('saveManagedExerciseEdits renames the exercise across plans and PR records', () => {
  const result = saveManagedExerciseEdits({
    exercises: [
      createExercise(),
      createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    ],
    plans: [createPlan()],
    prs: [createPr()],
    exerciseId: 'exercise-1',
    nextName: 'Incline Bench',
    nextPrimaryMuscle: 'Chest',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.exercises[0].name, 'INCLINE BENCH');
  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['INCLINE BENCH', 'SQUAT']);
  assert.equal(result.plans[0].exerciseSetCounts?.['INCLINE BENCH'], 3);
  assert.equal(result.plans[0].exerciseSetCounts?.['BENCH PRESS'], undefined);
  assert.equal(result.prs[0].exerciseName, 'INCLINE BENCH');
});

test('saveManagedExerciseEdits rejects duplicate normalized names', () => {
  const result = saveManagedExerciseEdits({
    exercises: [
      createExercise(),
      createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    ],
    plans: [createPlan()],
    prs: [createPr()],
    exerciseId: 'exercise-1',
    nextName: ' squat ',
    nextPrimaryMuscle: 'Chest',
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'AN EXERCISE WITH THAT NAME ALREADY EXISTS',
  });
});

test('saveManagedExerciseEdits updates only the muscle group when the name is unchanged', () => {
  const result = saveManagedExerciseEdits({
    exercises: [createExercise()],
    plans: [createPlan()],
    prs: [createPr()],
    exerciseId: 'exercise-1',
    nextName: 'BENCH PRESS',
    nextPrimaryMuscle: 'Shoulders',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.exercises[0].primaryMuscle, 'Shoulders');
  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['BENCH PRESS', 'SQUAT']);
  assert.equal(result.prs[0].exerciseName, 'BENCH PRESS');
});

test('saveManagedExerciseEdits rewrites mixed-case schedule entries for a casing-only rename', () => {
  const result = saveManagedExerciseEdits({
    exercises: [createExercise({ name: 'Bench Press' })],
    plans: [
      createPlan({
        schedule: {
          MON: { type: 'workout', exercises: ['Bench Press', 'SQUAT'] },
          TUE: { type: 'rest', description: 'REST DAY' },
          WED: { type: 'rest', description: 'REST DAY' },
          THU: { type: 'rest', description: 'REST DAY' },
          FRI: { type: 'rest', description: 'REST DAY' },
          SAT: { type: 'rest', description: 'REST DAY' },
          SUN: { type: 'rest', description: 'REST DAY' },
        },
      }),
    ],
    prs: [createPr({ exerciseName: 'Bench Press' })],
    exerciseId: 'exercise-1',
    nextName: 'bench press',
    nextPrimaryMuscle: 'Chest',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.exercises[0].name, 'BENCH PRESS');
  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['BENCH PRESS', 'SQUAT']);
  assert.equal(result.prs[0].exerciseName, 'BENCH PRESS');
});

test('saveManagedExerciseEdits repairs stale mixed-case schedule entries when the exercise name is already canonical', () => {
  const result = saveManagedExerciseEdits({
    exercises: [createExercise()],
    plans: [
      createPlan({
        schedule: {
          MON: { type: 'workout', exercises: ['Bench Press', 'SQUAT'] },
          TUE: { type: 'rest', description: 'REST DAY' },
          WED: { type: 'rest', description: 'REST DAY' },
          THU: { type: 'rest', description: 'REST DAY' },
          FRI: { type: 'rest', description: 'REST DAY' },
          SAT: { type: 'rest', description: 'REST DAY' },
          SUN: { type: 'rest', description: 'REST DAY' },
        },
      }),
    ],
    prs: [createPr({ exerciseName: 'Bench Press' })],
    exerciseId: 'exercise-1',
    nextName: 'bench press',
    nextPrimaryMuscle: 'Chest',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.exercises[0].name, 'BENCH PRESS');
  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['BENCH PRESS', 'SQUAT']);
  assert.equal(result.prs[0].exerciseName, 'BENCH PRESS');
});

test('saveManagedExerciseEdits renames exercises on rest-marked schedule entries that still retain exercises', () => {
  const result = saveManagedExerciseEdits({
    exercises: [createExercise()],
    plans: [
      createPlan({
        schedule: {
          MON: { type: 'rest', description: 'REST DAY', exercises: ['BENCH PRESS'] },
          TUE: { type: 'rest', description: 'REST DAY' },
          WED: { type: 'rest', description: 'REST DAY' },
          THU: { type: 'rest', description: 'REST DAY' },
          FRI: { type: 'rest', description: 'REST DAY' },
          SAT: { type: 'rest', description: 'REST DAY' },
          SUN: { type: 'rest', description: 'REST DAY' },
        },
      }),
    ],
    prs: [createPr()],
    exerciseId: 'exercise-1',
    nextName: 'Incline Bench',
    nextPrimaryMuscle: 'Chest',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['INCLINE BENCH']);
  assert.equal(result.plans[0].exerciseSetCounts?.['INCLINE BENCH'], 3);
  assert.equal(result.plans[0].exerciseSetCounts?.['BENCH PRESS'], undefined);
});

test('deleteManagedExercise removes the exercise from plans and PR records while preserving other set counts', () => {
  const result = deleteManagedExercise({
    exercises: [
      createExercise(),
      createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    ],
    plans: [createPlan()],
    prs: [
      createPr(),
      createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT', weight: 315 }),
    ],
    exerciseId: 'exercise-1',
  });

  assert.deepEqual(result.exercises.map((exercise) => exercise.id), ['exercise-2']);
  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['SQUAT']);
  assert.equal(result.plans[0].exerciseSetCounts?.SQUAT, 4);
  assert.equal(result.plans[0].exerciseSetCounts?.['BENCH PRESS'], undefined);
  assert.deepEqual(result.prs.map((pr) => pr.exerciseId), ['exercise-2']);
});

test('deleteManagedExercise removes exercises from rest-marked schedule entries that still retain exercises', () => {
  const result = deleteManagedExercise({
    exercises: [
      createExercise(),
      createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    ],
    plans: [
      createPlan({
        schedule: {
          MON: { type: 'rest', description: 'REST DAY', exercises: ['BENCH PRESS', 'SQUAT'] },
          TUE: { type: 'rest', description: 'REST DAY' },
          WED: { type: 'rest', description: 'REST DAY' },
          THU: { type: 'rest', description: 'REST DAY' },
          FRI: { type: 'rest', description: 'REST DAY' },
          SAT: { type: 'rest', description: 'REST DAY' },
          SUN: { type: 'rest', description: 'REST DAY' },
        },
      }),
    ],
    prs: [createPr()],
    exerciseId: 'exercise-1',
  });

  assert.deepEqual(result.plans[0].schedule.MON.exercises, ['SQUAT']);
  assert.equal(result.plans[0].exerciseSetCounts?.SQUAT, 4);
  assert.equal(result.plans[0].exerciseSetCounts?.['BENCH PRESS'], undefined);
});
