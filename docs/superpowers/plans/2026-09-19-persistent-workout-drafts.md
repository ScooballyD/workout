# Persist Workout Drafts Across Relaunch

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Users can change an unfinished set's weight or reps in Exercise Detail, return to Grind, force-close and relaunch the Android app, and still see and log that edited set. An unfinished edit remains a draft, not a completed `Exercise.logs` entry, and never appears in an exported backup.

## Context and Orientation

`src/App.tsx` owns persisted React state for exercises, plans, PRs, active-plan selection, and settings. `ExerciseLog` currently creates route-local `ExerciseLogInputValue[]` state with `createExerciseLogInputValues`, and discards it on unmount. `DailyGrind` independently calls `getNextSetInfo`, so `LOG NEXT SET` currently has no access to an edit made in the detail route.

`src/lib/exercise-log-inputs.ts` defines input values and `default`, `manual`, and `propagated` source semantics. Keep it as the source of truth for deriving defaults and match-weight propagation. `src/lib/next-set-info.ts` derives the normal next set. `src/lib/workout-completion.ts`, `src/lib/plans.ts`, and `src/lib/exercise-management.ts` contain lifecycle helpers that determine when a draft context can no longer be valid.

The new `src/lib/workout-drafts.ts` module will own a versioned `localStorage` format and pure operations. It must not add draft fields to `Exercise`, `TrainingPlan`, the backup import shape, or the export payload. `App.tsx` will load and persist its `WorkoutDrafts` state under a separate `workout_drafts` key and supply context-specific drafts to both routes.

## Progress

- [x] 2026-09-19 America/Chicago: Approved the separate versioned draft-store design in `docs/superpowers/specs/2026-09-19-persistent-workout-drafts-design.md`.
- [x] 2026-09-19 America/Chicago: Created isolated `persistent-workout-drafts` worktree and confirmed the baseline with `npm test` (75 passing tests).
- [x] 2026-09-19 America/Chicago: Mapped detail input, Grind logging, unit conversion, backup, and cleanup call sites.
- [x] 2026-09-19 America/Chicago: Added focused draft-storage, source-semantics, and next-set-resolution regressions; captured red evidence before implementation.
- [x] 2026-09-19 America/Chicago: Implemented the separate draft store and wired it through Exercise Detail, Grind, unit conversion, and lifecycle cleanup.
- [x] 2026-09-19 America/Chicago: Completed sequential implementation, validation, and final high-risk review; two source-semantics P1 findings were fixed and re-reviewed.
- [x] 2026-09-19 America/Chicago: Passed `npm test` (93 tests), `npm run lint`, production build, Capacitor sync, and Android debug APK compilation.
- [x] 2026-09-19 America/Chicago: Installed the debug APK on `RFCXA18J0YP` and verified detail edit, Android back, Grind display/logging, force-stop/relaunch persistence, completed-workout cleanup, and clean process Logcat.

## Decision Log

- Decision: Store drafts outside exercises, plans, PRs, and backups in a separate versioned `workout_drafts` record.
  Rationale: A draft is an incomplete UI edit, while sparse `Exercise.logs` represents completed work. Keeping them separate prevents unfinished values from affecting history, PRs, or exports.
  Date/Author: 2026-09-19 / Codex and user

- Decision: Key each draft by plan ID, absolute plan day (`currentDay`), exercise ID, and zero-based set index.
  Rationale: The same named weekday repeats every week; `currentDay` distinguishes its concrete workout instance. Exercise ID prevents name edits from applying an old draft to a new exercise.
  Date/Author: 2026-09-19 / Codex

- Decision: Persist an entire `ExerciseLogInputValue` payload for each draft, including independent weight and reps source metadata.
  Rationale: Match-weight propagation must survive navigation/relaunch without turning propagated values into manual values or recalculating a stale default.
  Date/Author: 2026-09-19 / Codex and user

- Decision: Convert draft weights during unit changes using the existing app conversion function and preserve reps/source fields.
  Rationale: The user explicitly chose conversion rather than discarding saved unfinished edits.
  Date/Author: 2026-09-19 / user

- Decision: Treat malformed storage and context-invalid drafts as disposable; remove them rather than attempting repair.
  Rationale: Drafts are convenience state, so conservative cleanup is safer than applying an ambiguous edit to a future workout.
  Date/Author: 2026-09-19 / Codex

## Surprises & Discoveries

- `DailyGrind` only receives today's exercise objects and calls `getNextSetInfo` directly for both display and `LOG NEXT SET`; it needs a context lookup in both locations.
- The existing unit toggle rounds all regular stored values to one decimal place, whereas generated next-set targets round to quarters. Draft conversion should use the former because it represents an entered/stored user weight and must behave consistently with logs and recommendations.
- Current completed-day cleanup calls `completeWorkoutExercises` and then advances the active plan. Draft cleanup must run in the same user action before the plan context changes.
- Backup export is assembled inline in `handleExportData`; keeping draft state separate automatically excludes it, but import/wipe must explicitly clear the separate local state.
- Review found two source-semantics regressions before merge: default-only input values could be stored and freeze future defaults, and Grind could consume both fields of a partial draft. The safe implementation now filters default-only drafts, hydrates each field independently, and resolves next-set display/log values by source for each field.
- The managed worktree sandbox prevents esbuild from reading ancestor directories. The production Vite build succeeds outside the sandbox; this is an environment restriction, not a build failure.
- No device was available from the local Android SDK `adb` path at verification time, so force-close/relaunch behavior has not been physically certified in this pass.

## Plan of Work

1. Create `src/lib/workout-drafts.ts` and `src/lib/workout-drafts.test.ts` before app wiring.
   - Define `WORKOUT_DRAFTS_STORAGE_KEY`, a current storage version, `WorkoutDraftContext` (`planId`, `planDay`, `exerciseId`, `setIndex`), `WorkoutDraft`, and a record/collection type keyed by a stable context-key builder.
   - Use the existing `ExerciseLogInputValue` source union or move only the shared type if doing so avoids a circular dependency. Validate finite non-negative weight/reps, integer non-negative set indexes and plan days, non-empty IDs, and valid source literals.
   - Export pure helpers to parse stored JSON, serialize the latest version, get/upsert a draft, remove a logged draft, remove all drafts for a plan/exercise, clear all, convert draft weights, and prune to a supplied set of valid contexts. Parsing malformed JSON, wrong versions, invalid entries, and duplicate keys must produce an empty safe collection or a normalized last-valid entry without throwing.
   - Keep `localStorage` calls at the `App.tsx` boundary so Node tests exercise pure data transformations without a DOM shim.
   - Write red tests for: valid round-trip and source preservation; malformed/version-invalid payload rejection; context isolation; a logged-set removal; plan/exercise/day pruning; unit conversion retaining reps/sources; and no draft for a different plan/day/set.

2. Extend `src/lib/exercise-log-inputs.ts` only as needed to compose defaults with saved drafts.
   - Add a pure merge/hydration helper that takes normal generated input values, completed exercise logs, and the matching context drafts. Completed logs always win; a valid saved draft replaces only that unfinished index.
   - Reuse `applyWeightChangeToInputs` and `applyRepsChangeToInputs` unchanged for source semantics. After either returns its next array, `App.tsx` will write every changed unfinished index for the active context, including propagated weights, to the draft store.
   - Add tests showing draft hydration preserves manual/propagated sources and does not override a completed log or apply to an out-of-range deload set.

3. Wire draft state and validated current context in `src/App.tsx`.
   - Initialize `workoutDrafts` from `parseWorkoutDrafts(localStorage.getItem(WORKOUT_DRAFTS_STORAGE_KEY))` and persist it in a dedicated effect. Remove the storage key rather than retaining an empty shell when no drafts remain.
   - Derive the active concrete workout context after `activePlan`, `dayCounter`, `todaySchedule`, and `todayExercises` are known. Create contexts only for workout-day exercises and `0..getPlanExerciseSetCount(...) - 1`; use these to prune drafts in an effect whenever plans, active plan, plan day, scheduled exercises, or set counts change.
   - Pass current-plan/day context plus context-specific draft lookup and `onDraftInputsChange` to `ExerciseLog`. Replace its unmount-scoped initialization/sync path with defaults merged with the persisted drafts. On each weight or reps edit, update its displayed inputs and write all unfinished changed values to `workoutDrafts`; never write them to `exercise.logs`.
   - Pass the same lookup into `DailyGrind`. For the active next-set index, prefer the matching draft's `weight` and `reps` over `getNextSetInfo` defaults in both the card display and `LOG NEXT SET`; nonmatching/missing drafts retain existing defaults.
   - Update `handleLogSet` to remove exactly the consumed draft after it creates the completed log. Preserve the existing haptic behavior. On unlog, do not recreate a draft; later defaults should follow the existing logs/lastLogs behavior.

4. Handle all invalidation boundaries in `src/App.tsx`.
   - In `handleToggleUnit`, run the existing conversion against every draft weight in the same update that converts exercises and PRs, keeping reps and source metadata untouched.
   - Clear all drafts in `handleCompleteWorkout`, `handleImportData`, and `handleWipeData` before or alongside the existing persisted-state replacements.
   - Remove drafts for a restarted plan in `handleRestartPlan`, all drafts for a deleted plan in `handleDeletePlan`, and drafts belonging to a deleted exercise in `handleDeleteExercise`.
   - In `handleSavePlan`, use context pruning after saved schedule/set-count changes rather than preserving drafts for removed exercise/day/set contexts. If a plan edit replaces the current day setup, the valid-context effect removes affected drafts.
   - Keep `handleExportData`'s payload unchanged and add a focused assertion that drafts are absent from it or a small export-data builder if extracting one improves testability.

5. Update tests and documentation after production behavior is green.
   - Run the new focused test file first, then `npm test`, `npm run lint`, `npm run build:android:web`, and `npm run sync:android`.
   - Run `npm run preview` and manually confirm browser persistence across detail navigation/reload. Build/install the debug APK on the connected Android device, then confirm: edit a set, navigate back, see its values on Grind, use `LOG NEXT SET`, verify only that draft is removed, edit another set, force-stop/relaunch, and verify it returns. Toggle units with a draft, complete/restart/delete/import/wipe relevant data, and confirm cleanup behavior.
   - Record any new Android/storage failure pattern in `agent_docs/codex.md`, update the active entry and completion history in `todo.md`, and request a Sol review because this changes persistence and `src/App.tsx` lifecycle state.

## Validation and Acceptance

- `node --test --test-isolation=none --experimental-strip-types src/lib/workout-drafts.test.ts` passes after first failing-test evidence is captured.
- `npm test` passes with all existing and new tests.
- `npm run lint` passes.
- `npm run build:android:web` passes.
- `npm run sync:android` detects `@capacitor/app` and completes.
- `npm run preview` verifies: edit an unfinished set in Exercise Detail, leave via back navigation, and Grind displays/logs that same value without a completed log having been created early.
- On a connected Android device, force-stop/relaunch after editing an unfinished set; its draft remains usable from Grind. Logging clears only that draft. Completing, restarting, deleting, importing, wiping, or invalidating the workout context removes affected drafts.
- Exported JSON contains only the existing backup fields and has no `workout_drafts` data.

## Idempotence and Recovery

The draft store is an isolated local-storage key. Re-running initialization, parsing, context pruning, or unit conversion should be safe because each uses pure replacement state rather than mutation. If development storage becomes malformed, remove only `workout_drafts`; do not clear the main exercise/plan/PR keys.

If implementation is interrupted after changing `App.tsx`, keep the new helper and its tests together, then revert the `App.tsx` wiring as one unit rather than adding drafts to `Exercise.logs`. If an Android build cannot find the SDK, set `ANDROID_HOME` only for the Gradle command as documented in `agent_docs/codex.md`; do not commit machine-specific `local.properties`.

## Outcomes & Retrospective

The implementation is ready for integration. It adds a standalone versioned `workout_drafts` local-storage record, source-aware hydration and Grind resolution, unit conversion, context pruning, lifecycle cleanup, and focused regression coverage. Automated verification passed: 93 Node tests, TypeScript lint, production Vite build, Capacitor Android sync, and Gradle `assembleDebug`. On physical Android device `RFCXA18J0YP`, an edited partial draft survived route exit and force-close/relaunch, appeared on Grind with its generated weight intact, logged correctly, and was cleared when the workout completed. Unit conversion and the remaining cleanup boundaries are covered by focused helper tests and remain part of the broader Android smoke-test task.
