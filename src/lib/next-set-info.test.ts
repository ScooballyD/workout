import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextSetInfo } from './next-set-info.ts';
import type { Exercise } from '../types.ts';

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
