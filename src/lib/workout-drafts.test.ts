import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertWorkoutDraftWeights,
  createWorkoutDraftKey,
  getWorkoutDraft,
  normalizeWorkoutDraftArray,
  parseWorkoutDrafts,
  pruneWorkoutDrafts,
  removeWorkoutDraft,
  removeWorkoutDraftsForExercise,
  removeWorkoutDraftsForPlan,
  serializeWorkoutDrafts,
  upsertWorkoutDraft,
  type WorkoutDraft,
  type WorkoutDraftContext,
  type WorkoutDrafts,
} from './workout-drafts.ts';

const benchSet = (setIndex = 0): WorkoutDraftContext => ({
  planId: 'plan-a',
  planDay: 8,
  exerciseId: 'bench',
  setIndex,
});

const draft = (
  context: WorkoutDraftContext = benchSet(),
  overrides: Partial<WorkoutDraft> = {}
): WorkoutDraft => ({
  ...context,
  weight: 187.5,
  reps: 6,
  weightSource: 'manual',
  repsSource: 'propagated',
  ...overrides,
});

test('workout drafts round-trip with input source metadata intact', () => {
  const stored = upsertWorkoutDraft({}, draft());

  const restored = parseWorkoutDrafts(serializeWorkoutDrafts(stored));

  assert.deepEqual(getWorkoutDraft(restored, benchSet()), draft());
});

test('parseWorkoutDrafts rejects malformed, unsupported, and invalid stored data safely', () => {
  assert.deepEqual(parseWorkoutDrafts('{bad json'), {});
  assert.deepEqual(parseWorkoutDrafts(JSON.stringify({ version: 2, drafts: [] })), {});
  assert.deepEqual(
    parseWorkoutDrafts(JSON.stringify({
      version: 1,
      drafts: [
        draft(),
        draft(benchSet(1), { weight: -1 }),
        draft(benchSet(2), { repsSource: 'unknown' as WorkoutDraft['repsSource'] }),
      ],
    })),
    { [createWorkoutDraftKey(benchSet())]: draft() }
  );
});

test('workout drafts remain isolated by plan, day, exercise, and set', () => {
  const contexts: WorkoutDraftContext[] = [
    benchSet(),
    { ...benchSet(), planId: 'plan-b' },
    { ...benchSet(), planDay: 9 },
    { ...benchSet(), exerciseId: 'squat' },
    benchSet(1),
  ];
  const drafts = contexts.reduce<WorkoutDrafts>(
    (current, context, index) =>
      upsertWorkoutDraft(current, draft(context, { weight: 100 + index })),
    {}
  );

  contexts.forEach((context, index) => {
    assert.equal(getWorkoutDraft(drafts, context)?.weight, 100 + index);
  });
  assert.equal(getWorkoutDraft(drafts, benchSet(5)), undefined);
});

test('removeWorkoutDraft removes only the logged set draft', () => {
  const drafts = upsertWorkoutDraft(
    upsertWorkoutDraft({}, draft(benchSet())),
    draft(benchSet(1))
  );

  const remaining = removeWorkoutDraft(drafts, benchSet());

  assert.equal(getWorkoutDraft(remaining, benchSet()), undefined);
  assert.deepEqual(getWorkoutDraft(remaining, benchSet(1)), draft(benchSet(1)));
});

test('plan and exercise cleanup remove only their matching drafts', () => {
  const otherPlan = { ...benchSet(), planId: 'plan-b' };
  const squat = { ...benchSet(), exerciseId: 'squat' };
  const drafts = [draft(), draft(otherPlan), draft(squat)].reduce<WorkoutDrafts>(
    (current, value) => upsertWorkoutDraft(current, value),
    {}
  );

  const withoutBench = removeWorkoutDraftsForExercise(drafts, 'bench');
  assert.deepEqual(Object.values(withoutBench), [draft(squat)]);

  const withoutPlanA = removeWorkoutDraftsForPlan(drafts, 'plan-a');
  assert.deepEqual(Object.values(withoutPlanA), [draft(otherPlan)]);
});

test('pruneWorkoutDrafts removes drafts outside the supplied current contexts', () => {
  const kept = benchSet(1);
  const staleDay = { ...benchSet(), planDay: 7 };
  const removedSet = benchSet(4);
  const drafts = [draft(kept), draft(staleDay), draft(removedSet)].reduce<WorkoutDrafts>(
    (current, value) => upsertWorkoutDraft(current, value),
    {}
  );

  const pruned = pruneWorkoutDrafts(drafts, [kept]);

  assert.deepEqual(Object.values(pruned), [draft(kept)]);
});

test('convertWorkoutDraftWeights preserves reps and source metadata', () => {
  const original = draft(benchSet(), {
    weight: 100,
    reps: 9,
    weightSource: 'propagated',
    repsSource: 'manual',
  });

  const converted = convertWorkoutDraftWeights(
    upsertWorkoutDraft({}, original),
    (weight) => Math.round(weight * 0.453592 * 10) / 10
  );

  assert.deepEqual(getWorkoutDraft(converted, benchSet()), {
    ...original,
    weight: 45.4,
  });
});

test('duplicate stored contexts keep the last valid draft', () => {
  const first = draft(benchSet(), { weight: 180 });
  const last = draft(benchSet(), { weight: 190 });

  const restored = parseWorkoutDrafts(JSON.stringify({
    version: 1,
    drafts: [first, last],
  }));

  assert.deepEqual(getWorkoutDraft(restored, benchSet()), last);
});

test('upsertWorkoutDraft rejects invalid runtime input', () => {
  const stored = upsertWorkoutDraft({}, draft(benchSet(), { weight: Number.NaN }));

  assert.deepEqual(stored, {});
});

test('workout draft storage rejects entries with only default-sourced fields', () => {
  const defaultOnly = draft(benchSet(), {
    weightSource: 'default',
    repsSource: 'default',
  });

  assert.deepEqual(upsertWorkoutDraft({}, defaultOnly), {});
  assert.deepEqual(
    parseWorkoutDrafts(JSON.stringify({ version: 1, drafts: [defaultOnly] })),
    {}
  );
});

test('strict draft normalization preserves valid sources and rejects an invalid member', () => {
  const valid = draft(benchSet(), {
    weightSource: 'propagated',
    repsSource: 'manual',
  });

  assert.deepEqual(normalizeWorkoutDraftArray([valid]), {
    [createWorkoutDraftKey(valid)]: valid,
  });
  assert.equal(
    normalizeWorkoutDraftArray([valid, { ...valid, exerciseId: 'x'.repeat(129) }]),
    null
  );
});

test('strict draft normalization bounds count, plan day, and set index before use', () => {
  assert.equal(normalizeWorkoutDraftArray(new Array(10_001)), null);
  assert.equal(
    normalizeWorkoutDraftArray([draft(benchSet(), { planDay: 3_642 })]),
    null
  );
  assert.equal(
    normalizeWorkoutDraftArray([draft(benchSet(), { setIndex: 100 })]),
    null
  );
});
