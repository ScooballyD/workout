import assert from 'node:assert/strict';
import test from 'node:test';

import { createId } from './id.ts';

test('createId returns the string from crypto.randomUUID()', () => {
  const originalRandomUUID = crypto.randomUUID;
  const expectedId = '123e4567-e89b-12d3-a456-426614174000';

  crypto.randomUUID = () => expectedId;

  try {
    assert.equal(createId(), expectedId);
  } finally {
    crypto.randomUUID = originalRandomUUID;
  }
});
