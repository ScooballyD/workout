import assert from 'node:assert/strict';
import test from 'node:test';

import type { PR } from '../types.ts';
import {
  filterPrsByExercise,
  getPrFilterOptions,
  togglePrExerciseFilter,
} from './pr-vault.ts';

const createPr = (overrides: Partial<PR>): PR => ({
  exerciseId: 'exercise-1',
  exerciseName: 'BENCH PRESS',
  weight: 225,
  date: '2026-04-01',
  history: [{ weight: 225, date: '2026-04-01' }],
  ...overrides,
});

test('getPrFilterOptions keeps ALL and adds only exercises present in PR data', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'bench press' }),
  ];

  assert.deepEqual(getPrFilterOptions(prs), ['ALL', 'BENCH PRESS', 'SQUAT']);
});

test('getPrFilterOptions returns only ALL when there is no PR data', () => {
  assert.deepEqual(getPrFilterOptions([]), ['ALL']);
});

test('filterPrsByExercise returns no PRs when no filters are selected', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'bench press' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'SQUAT' }),
  ];

  assert.deepEqual(filterPrsByExercise(prs, []), []);
});

test('filterPrsByExercise matches selected names case-insensitively', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'bench press' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'SQUAT' }),
  ];

  assert.deepEqual(filterPrsByExercise(prs, ['BENCH PRESS']), prs.slice(0, 2));
});

test('filterPrsByExercise returns combined results for multiple selected filters', () => {
  const prs = [
    createPr({ exerciseId: 'exercise-1', exerciseName: 'BENCH PRESS' }),
    createPr({ exerciseId: 'exercise-2', exerciseName: 'SQUAT' }),
    createPr({ exerciseId: 'exercise-3', exerciseName: 'DEADLIFT' }),
  ];

  assert.deepEqual(
    filterPrsByExercise(prs, ['BENCH PRESS', 'DEADLIFT']),
    [prs[0], prs[2]],
  );
});

test('togglePrExerciseFilter toggles individual workout filters on and off', () => {
  const filters = ['ALL', 'BENCH PRESS', 'SQUAT'];

  assert.deepEqual(togglePrExerciseFilter([], 'BENCH PRESS', filters), ['BENCH PRESS']);
  assert.deepEqual(togglePrExerciseFilter(['BENCH PRESS'], 'BENCH PRESS', filters), []);
});

test('togglePrExerciseFilter uses ALL to select every workout filter from a partial selection', () => {
  const filters = ['ALL', 'BENCH PRESS', 'SQUAT', 'DEADLIFT'];

  assert.deepEqual(
    togglePrExerciseFilter(['BENCH PRESS'], 'ALL', filters),
    ['BENCH PRESS', 'SQUAT', 'DEADLIFT'],
  );
});

test('togglePrExerciseFilter uses ALL to clear filters when every workout filter is selected', () => {
  const filters = ['ALL', 'BENCH PRESS', 'SQUAT'];

  assert.deepEqual(togglePrExerciseFilter(['BENCH PRESS', 'SQUAT'], 'ALL', filters), []);
});
