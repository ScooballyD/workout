import assert from 'node:assert/strict';
import test from 'node:test';

import type { Exercise, PR, TrainingPlan } from '../types.ts';
import {
  applyWorkoutPrUpdates,
  getPrChartDomain,
  filterPrsByMuscleGroup,
  getPrFilterOptions,
  togglePrExerciseFilter,
} from './pr-vault.ts';

const createExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'BENCH PRESS',
  primaryMuscle: 'Chest',
  sets: 3,
  reps: '5-8',
  logs: [],
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

const createPlan = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-1',
  name: 'BASE',
  durationWeeks: 4,
  currentWeek: 1,
  currentDay: 1,
  schedule: {
    MON: { type: 'workout', exercises: ['BENCH PRESS'] },
  },
  ...overrides,
});

test('getPrFilterOptions keeps ALL and adds only muscle groups present in PR data', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'LEGACY PRESS' }),
    createPr({ exerciseId: 'exercise-4', exerciseName: 'bench press' }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'BENCH PRESS', primaryMuscle: 'Chest' }),
    createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    createExercise({ id: 'exercise-3', name: 'LEGACY PRESS', primaryMuscle: 'legacy-tag' as never }),
  ];

  assert.deepEqual(getPrFilterOptions(prs, exercises), ['ALL', 'Chest', 'Quads', 'Other']);
});

test('getPrFilterOptions returns only ALL when there is no PR data', () => {
  assert.deepEqual(getPrFilterOptions([], []), ['ALL']);
});

test('filterPrsByMuscleGroup returns no PRs when no filters are selected', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'DEADLIFT' }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'BENCH PRESS', primaryMuscle: 'Chest' }),
    createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    createExercise({ id: 'exercise-3', name: 'DEADLIFT', primaryMuscle: 'Back' }),
  ];

  assert.deepEqual(filterPrsByMuscleGroup(prs, [], exercises), []);
});

test('filterPrsByMuscleGroup matches selected muscle groups case-insensitively', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'DEADLIFT' }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'BENCH PRESS', primaryMuscle: 'Chest' }),
    createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    createExercise({ id: 'exercise-3', name: 'DEADLIFT', primaryMuscle: 'Back' }),
  ];

  assert.deepEqual(filterPrsByMuscleGroup(prs, ['chest'], exercises), [prs[0]]);
});

test('filterPrsByMuscleGroup returns combined results for multiple selected filters', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'DEADLIFT' }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'BENCH PRESS', primaryMuscle: 'Chest' }),
    createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    createExercise({ id: 'exercise-3', name: 'DEADLIFT', primaryMuscle: 'Back' }),
  ];

  assert.deepEqual(
    filterPrsByMuscleGroup(prs, ['Chest', 'Back'], exercises),
    [prs[0], prs[2]],
  );
});

test('filterPrsByMuscleGroup sorts visible PRs by most recent activity before stale histories', () => {
  const prs = [
    createPr({
      exerciseId: 'exercise-1',
      exerciseName: 'BENCH PRESS',
      date: '2026-04-01',
      history: [
        { weight: 215, date: '2026-03-01' },
        { weight: 225, date: '2026-04-01' },
      ],
    }),
    createPr({
      exerciseId: 'exercise-2',
      exerciseName: 'SQUAT',
      date: '2026-03-15',
      history: [
        { weight: 315, date: '2026-03-15' },
        { weight: 315, date: '2026-04-06' },
      ],
    }),
    createPr({
      exerciseId: 'exercise-3',
      exerciseName: 'DEADLIFT',
      date: '2026-02-20',
      history: [
        { weight: 405, date: '2026-02-10' },
        { weight: 425, date: '2026-02-20' },
      ],
    }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'BENCH PRESS', primaryMuscle: 'Chest' }),
    createExercise({ id: 'exercise-2', name: 'SQUAT', primaryMuscle: 'Quads' }),
    createExercise({ id: 'exercise-3', name: 'DEADLIFT', primaryMuscle: 'Back' }),
  ];

  assert.deepEqual(
    filterPrsByMuscleGroup(prs, ['Chest', 'Quads', 'Back'], exercises).map(pr => pr.exerciseName),
    ['SQUAT', 'BENCH PRESS', 'DEADLIFT'],
  );
});

test('filterPrsByMuscleGroup keeps recency ties deterministic by exercise name then id', () => {
  const prs = [
    createPr({
      exerciseId: 'exercise-2',
      exerciseName: 'PULL UP',
      date: '2026-04-05',
      history: [{ weight: 45, date: '2026-04-05' }],
    }),
    createPr({
      exerciseId: 'exercise-1',
      exerciseName: 'CURL',
      date: '2026-04-05',
      history: [{ weight: 35, date: '2026-04-05' }],
    }),
    createPr({
      exerciseId: 'exercise-3',
      exerciseName: 'CURL',
      date: '2026-04-05',
      history: [{ weight: 40, date: '2026-04-05' }],
    }),
  ];
  const exercises = [
    createExercise({ id: 'exercise-1', name: 'CURL', primaryMuscle: 'Biceps' }),
    createExercise({ id: 'exercise-2', name: 'PULL UP', primaryMuscle: 'Back' }),
    createExercise({ id: 'exercise-3', name: 'CURL', primaryMuscle: 'Biceps' }),
  ];

  assert.deepEqual(
    filterPrsByMuscleGroup(prs, ['Back', 'Biceps'], exercises).map(pr => pr.exerciseId),
    ['exercise-1', 'exercise-3', 'exercise-2'],
  );
});

test('togglePrExerciseFilter toggles individual muscle-group filters on and off', () => {
  const filters = ['ALL', 'Chest', 'Back', 'Other'];

  assert.deepEqual(togglePrExerciseFilter([], 'Chest', filters), ['Chest']);
  assert.deepEqual(togglePrExerciseFilter(['Chest'], 'Chest', filters), []);
});

test('togglePrExerciseFilter uses ALL to select every muscle-group filter from a partial selection', () => {
  const filters = ['ALL', 'Chest', 'Back', 'Other'];

  assert.deepEqual(
    togglePrExerciseFilter(['Chest'], 'ALL', filters),
    ['Chest', 'Back', 'Other'],
  );
});

test('togglePrExerciseFilter uses ALL to clear filters when every muscle-group filter is selected', () => {
  const filters = ['ALL', 'Chest', 'Back', 'Other'];

  assert.deepEqual(togglePrExerciseFilter(['Chest', 'Back', 'Other'], 'ALL', filters), []);
});

test('applyWorkoutPrUpdates preserves non-deload PR behavior for completed workout exercises', () => {
  const exercises = [
    createExercise({
      id: 'exercise-1',
      name: 'BENCH PRESS',
      logs: [{ weight: 235, reps: 5, completed: true }],
    }),
  ];
  const existingPrs = [createPr()];

  const updated = applyWorkoutPrUpdates({
    prs: existingPrs,
    exercises,
    completedExerciseNames: ['BENCH PRESS'],
    date: '2026-04-07',
    plan: createPlan(),
    week: 1,
  });

  assert.deepEqual(updated, [{
    ...existingPrs[0],
    weight: 235,
    date: '2026-04-07',
    history: [
      ...existingPrs[0].history,
      { weight: 235, date: '2026-04-07' },
    ],
  }]);
});

test('applyWorkoutPrUpdates skips PR changes during the final deload week', () => {
  const exercises = [
    createExercise({
      id: 'exercise-1',
      name: 'BENCH PRESS',
      logs: [{ weight: 235, reps: 5, completed: true }],
    }),
  ];
  const existingPrs = [createPr()];

  const updated = applyWorkoutPrUpdates({
    prs: existingPrs,
    exercises,
    completedExerciseNames: ['BENCH PRESS'],
    date: '2026-04-07',
    plan: createPlan({
      durationWeeks: 5,
      deload: {
        enabled: true,
        baseDurationWeeks: 4,
      },
    }),
    week: 5,
  });

  assert.deepEqual(updated, existingPrs);
});

test('getPrChartDomain zooms into meaningful heavy-lift progress without clipping points', () => {
  const domain = getPrChartDomain([
    { weight: 405, date: '2026-03-01' },
    { weight: 410, date: '2026-03-10' },
    { weight: 415, date: '2026-03-20' },
    { weight: 425, date: '2026-04-01' },
  ]);

  assert.equal(domain.min, 405);
  assert.equal(domain.max, 425);
  assert(domain.domain[0] < 405);
  assert(domain.domain[1] > 425);
  assert(domain.domain[1] - domain.domain[0] < 80);
});

test('getPrChartDomain keeps small absolute lifts readable without overstating tiny jumps', () => {
  const domain = getPrChartDomain([
    { weight: 10, date: '2026-03-01' },
    { weight: 10.5, date: '2026-03-10' },
    { weight: 11, date: '2026-03-20' },
  ]);

  assert.equal(domain.min, 10);
  assert.equal(domain.max, 11);
  assert(domain.domain[0] <= 10);
  assert(domain.domain[1] >= 11);
  assert(domain.domain[1] - domain.domain[0] >= 2);
  assert(domain.domain[1] - domain.domain[0] <= 6);
});

test('getPrChartDomain creates a stable fallback range for flat or single-point histories', () => {
  const singlePointDomain = getPrChartDomain([{ weight: 225, date: '2026-04-01' }]);
  const flatDomain = getPrChartDomain([
    { weight: 225, date: '2026-03-01' },
    { weight: 225, date: '2026-04-01' },
  ]);

  assert.equal(singlePointDomain.min, 225);
  assert.equal(singlePointDomain.max, 225);
  assert(singlePointDomain.domain[0] < 225);
  assert(singlePointDomain.domain[1] > 225);
  assert.equal(singlePointDomain.domain[1] - singlePointDomain.domain[0], flatDomain.domain[1] - flatDomain.domain[0]);
});
