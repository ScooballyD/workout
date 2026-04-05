import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextIncompleteSetIndex } from './exercise-progress.ts';

test('getNextIncompleteSetIndex returns the first sparse slot before later completed logs', () => {
  const nextIndex = getNextIncompleteSetIndex(
    [
      undefined,
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    3
  );

  assert.equal(nextIndex, 0);
});

test('getNextIncompleteSetIndex returns null when every tracked set is completed', () => {
  const nextIndex = getNextIncompleteSetIndex(
    [
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
      { weight: 185, reps: 5, completed: true },
    ],
    3
  );

  assert.equal(nextIndex, null);
});
