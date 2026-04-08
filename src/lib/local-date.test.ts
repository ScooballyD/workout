import assert from 'node:assert/strict';
import test from 'node:test';

import { getLocalCalendarDateString } from './local-date.ts';

test('getLocalCalendarDateString uses the local calendar day instead of UTC rollover', () => {
  const date = {
    getFullYear: () => 2026,
    getMonth: () => 2,
    getDate: () => 31,
    toISOString: () => '2026-04-01T01:30:00.000Z',
  } as Date;

  assert.equal(getLocalCalendarDateString(date), '2026-03-31');
});
