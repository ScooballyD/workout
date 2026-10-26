# Align Generated Schedule Descriptions With Persistence

## Purpose / User Outcome

Fix PR #5 feedback: supported workouts must save, export and migrate even when
their joined exercise description exceeds the ordinary 200-character text cap.
Reject schedule additions that exceed supported name/count limits before the
editor adopts them, with visible feedback and unchanged existing data.

## Context And Orientation

`plan-editor.ts` builds descriptions with `exercises.join(', ')`.
`backup.ts` currently validates descriptions against `maxTextLength = 200`.
The supported day has 100 names of up to 200 UTF-16 code units, so a complete
generated description can require `100 * 200 + 99 * 2 = 20198` code units.
`workout-storage.ts` reuses validation for save/export/migration, exposing the
mismatch even for data the app itself generated. The checkout started clean at
`aadec8c`.

## Progress

- [x] 2026-10-26 America/Chicago: Confirmed producer/validator mismatch and inspected editor entry paths.
- [x] Persistence specialist observed failing 217-character and maximum-boundary persistence tests, then implemented shared limits and editor feedback; focused tests passed 62/62.
- [x] Independent reviewer found no issues in the scoped source/test changes.
- [x] Manager verified 154 tests, TypeScript, production build, five production-UI checks, Capacitor sync and updated docs.

## Decision Log

- Use a distinct derived description bound rather than loosening all text limits or silently truncating user data.
- Keep 2 MiB whole-backup/snapshot limit, 100 scheduled names/day and 200 code units/name.
- Support long legacy generated descriptions on workout and rest entries that retain exercises.
- Reject invalid editor additions before changing schedule or muscle metadata. Check normalized names, including uppercase expansion.
- Do not broaden this fix to unrelated field limits, dependency upgrades or workout-history behavior.
- Sequence implementer then reviewer, with manager owning docs and final verification. No commit/push or GitHub reply requested.

## Plan Of Work

Specialist owns `src/lib/data-limits.ts`, `backup.ts`, `plan-editor.ts`, their
tests and focused `workout-storage.test.ts` regressions, plus minimal App wiring.
Manager owns this plan, durable docs and isolated preview fixtures/checks.

## Validation And Acceptance

Regressions must cover a nine-exercise >200-character description, the exact
maximum derived description and maximum+1 rejection, ordinary text rejection,
save/export/re-import/legacy migration, and editor count/name boundaries.
Run focused tests red/green, `npm test`, `npm run lint`, `npm run build`, and
production preview with synthetic data. No real localStorage or phone data.

## Idempotence And Recovery

Do not truncate/rewrite valid descriptions or remove original legacy keys.
Reject out-of-range input without changing existing editor schedule. Preserve
all unrelated files. Changes are local until separately committed/published.

## Surprises & Discoveries

The previous tests explicitly rejected every 201-character description; those
expectations encode the incorrect shared limit and need a dedicated boundary.

Unrelated preexisting checkout state: the private study guide is now tracked
and the earlier root ignore additions are absent. User explicitly approved
restoring the guide exclusion: the root ignore rule was restored and five
guide files were removed from the index only, retaining local copies. Ignore/
link verification passed. These staged removals do not erase prior history;
the broader missing secret-ignore patterns were not changed without approval.

## Outcomes & Retrospective

The schedule-description cap is derived as 20,198 UTF-16 code units, while
individual text remains capped at 200 and full snapshots/backups at 2 MiB.
Normalized overlong names and additions beyond 100/day are rejected before
schedule/muscle updates, with retained input and visible feedback. Save,
export/re-import and legacy migration tests cover the full generated maximum.

Manager evidence: `npm test` 154/154; `npm run lint`, `npm run build`,
`npm run sync:android`, and `git diff --check` passed. The isolated mobile
preview created a nine-exercise 243-character description, saved it unchanged,
reloaded without recovery, exported/re-imported it, rejected a 201-character
name visibly, and rejected a 101st exercise while preserving saveable state.
No browser page errors occurred. Native-device behavior was not rerun for
this source/validation fix. No commit, push, or GitHub review reply performed.
