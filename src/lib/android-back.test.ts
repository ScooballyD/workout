import assert from 'node:assert/strict';
import test from 'node:test';

import { getAndroidBackAction } from './android-back.ts';

test('root exits the app regardless of browser history', () => {
  assert.equal(getAndroidBackAction('/', true), 'exit-app');
  assert.equal(getAndroidBackAction('/', false), 'exit-app');
});

test('nested routes use browser history when it is available', () => {
  assert.equal(getAndroidBackAction('/exercise/bench', true), 'history-back');
  assert.equal(getAndroidBackAction('/plans', true), 'history-back');
});

test('a direct visit to a nested route navigates to root', () => {
  assert.equal(getAndroidBackAction('/exercise/bench', false), 'navigate-root');
});
