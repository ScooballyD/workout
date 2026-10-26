# Bound Backup Import And Storage

## Purpose / User Outcome

Implement task 2 in todo.md: resource-bounded import/restore and recoverable,
complete persistence without losing existing user data on a failed import.

## Context and Orientation

The approved task scope is in todo.md; concrete policy is in
`docs/superpowers/specs/2026-10-22-bounded-backup-import-design.md`.
`src/lib/backup.ts` owns normalization; App currently uses independent storage
effects. `workout-drafts.ts` stores source-aware unfinished inputs separately.

## Progress

- [x] 2026-10-22 America/Chicago: Inspected import, restore, persistence, draft and plan flows; defined bounded policy and atomic snapshot approach within the requested task.
- [x] 2026-10-22 America/Chicago: Validation specialist added limits and file validation; eight boundary tests failed against the original code, then 34 focused / 125 full tests, typecheck and build passed. Manager reviewed the slice.
- [x] Specialist integrated atomic snapshot storage, recoverable UI, and bounded drafts with tests first.
- [x] Independent review identified recovery-lock, duplicated-default, and redundant-serialization issues; fixes received a clean follow-up review on 2026-10-23.
- [x] 2026-10-23 America/Chicago: Manager verified 147 tests, TypeScript, production build, isolated mobile preview, Capacitor sync, Android debug packaging, docs and task status. Physical-device coverage is deferred by user choice.

## Decision Log

- Use one atomic canonical snapshot rather than a multi-key rollback journal: a failed single localStorage write preserves the old complete value. Retain legacy keys until explicit user cleanup instead of risking quota-related migration loss.
- Existing task authorization covers implementation; no additional product permission is needed for internal persistence mechanics. No commit or push is requested.
- Sequence specialist implementation before review per task_master.md. Use GPT-5.6 Sol / medium for persistence work.

## Surprises & Discoveries

- Startup currently normalizes malformed values to defaults and immediately writes those defaults back. New recovery mode must prevent this overwrite.
- Imports change in-memory state before per-key storage effects; a quota failure can otherwise create a mixed saved state.
- User selected browser/build checks for this run because no Android device is connected. Do not claim device verification.
- Warning kind is not a safe recovery lock: a later failed operation can change the message while invalid original data still needs protection. The lock is now independent, with raw-data export and retry-load controls.
- Reusing starter constants preserves fresh-launch set counts; reset intentionally retains the existing two-set starter behavior. Removed a redundant whole-state JSON roundtrip from each save.

## Plan of Work

1. Add `src/lib/data-limits.ts`; add focused backup boundary tests, observe failures, and update `backup.ts`. Add an injectable file-reader helper so size checks and errors are testable without changing real storage.
2. Add `src/lib/workout-storage.ts` and tests using fake Storage. Validate/read canonical and legacy state, bound drafts, persist one versioned snapshot, and return structured errors. Wire App startup/saving/import/wipe and Settings file input; expose persistent save/recovery feedback and retry/export.
3. Review new helpers and App wiring for stale saves after import/wipe, render loops, quota failures, migration fallback, preserved invalid raw storage, and draft cleanup/units.
4. Run focused tests then full tests/typecheck/build and isolated preview scenarios. Rebuild/sync Android and test device if connected. Update durable persistence guidance and task tracking only according to actual verification.

## Validation and Acceptance

Run focused Node tests via `node --test --test-isolation=none --experimental-strip-types <test files>`, then `npm test`, `npm run lint`, `npm run build`, and production preview. Test oversized and valid import, rejected import with unchanged old state, reload, invalid saved data preserved, injected write failures, retry/export and draft relaunch. Run `npm run sync:android` and check ADB for device availability without touching real test data.

## Idempotence and Recovery

Do not clear original legacy state during migration. The canonical write is
atomic; failed import does not replace UI state. Preserve other worktree edits
and audit artifacts. Do not commit, publish, or overwrite device user data.

## Outcomes & Retrospective

Implemented shared 2 MiB/structural limits and atomic complete-state persistence
with legacy migration, recoverable import/save errors, latched startup recovery,
retry-load, and clearly distinguished raw/current-data exports. No dependencies
added and no commit or push performed.

Final evidence: `npm test` (147/147), `npm run lint`, `npm run build`,
`npm run sync:android`, and `android/gradlew.bat assembleDebug` all passed.
Production mobile-browser checks passed for malformed/oversized/excessive-count
imports, unchanged UI/storage on failed imports, routine quota retry/reload,
invalid-original preservation through edits/reload, raw/normal export,
transient read-denial recovery, and unlogged weight/reps draft reload.
Existing Gradle flatDir/deprecation warnings remain; no new native errors.
Physical-device import/force-close/relaunch remains a focused todo follow-up.

Follow-up completed on 2026-10-23: isolated Samsung Galaxy S24 / Android 16
testing passed valid/invalid/oversized imports, failure recovery, native import
picker and draft force-stop/relaunch. See
`docs/android-backup-verification-2026-10-23.md` for evidence and limitations;
native exported-file delivery remains unverified. The original tester app was
not replaced or cleared, and temporary device artifacts were removed.
