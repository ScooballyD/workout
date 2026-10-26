# Megalifts Code Walkthrough

> Audience: a Python programmer learning TypeScript and React by reading the current working tree dated 2026-10-23. This describes source code, including uncommitted fixes; it does not assert that the same code is deployed in a tester build.

## 1. The useful mental model

Megalifts is a client-side workout tracker delivered as a web/PWA app and through a Capacitor Android WebView. It uses browser and native-bridge APIs, but requires no backend service or remote database at runtime. React holds one `WorkoutState` object in memory, renders screens from it, and saves the whole object to one `localStorage` entry. Most business rules are pure functions under [`../src/lib/`](../src/lib/); [`../src/App.tsx`](../src/App.tsx) connects those functions to React state, browser/native capabilities, and UI events.

For a Python comparison, treat `App` as a long-lived controller whose state is an immutable dictionary. A React setter does not mutate that dictionary. It supplies a replacement, usually derived from the previous value:

```tsx
// Actual excerpt, App.tsx; outer indentation normalized
setWorkoutState((current) => ({
  ...current,
  [key]: typeof action === 'function'
    ? (action as (value: WorkoutState[K]) => WorkoutState[K])(current[key])
    : action,
}));
```

`...current` resembles `{**current}` in Python. `[key]` is a computed property name. The generic `<K extends keyof WorkoutState>` around the real helper tells TypeScript that a field and its replacement value must match. The thin `setExercises`, `setPlans`, and similar wrappers preserve familiar React setter APIs while all updates still land in one state packet.

### Architecture and file map

- [`../src/main.tsx`](../src/main.tsx) registers the PWA service worker and mounts `<App />` in React `StrictMode`.
- [`../src/App.tsx`](../src/App.tsx) contains routes, major screens, event handlers, derived “today” state, and persistence wiring. It is the integration hub.
- [`../src/types.ts`](../src/types.ts) declares persisted domain shapes.
- [`../src/constants.ts`](../src/constants.ts) supplies four starter exercises; PRs start empty.
- [`../src/lib/workout-storage.ts`](../src/lib/workout-storage.ts) owns the canonical snapshot, startup, migration, saving, import commit, wipe, and recovery export.
- [`../src/lib/backup.ts`](../src/lib/backup.ts), [`../src/lib/backup-file.ts`](../src/lib/backup-file.ts), and [`../src/lib/data-limits.ts`](../src/lib/data-limits.ts) validate untrusted JSON and bound resource use.
- [`../src/lib/exercise-log-inputs.ts`](../src/lib/exercise-log-inputs.ts), [`../src/lib/next-set-info.ts`](../src/lib/next-set-info.ts), and [`../src/lib/workout-drafts.ts`](../src/lib/workout-drafts.ts) implement generated inputs, source priority, match-weight behavior, and unfinished edits.
- [`../src/lib/plan-progress.ts`](../src/lib/plan-progress.ts), [`../src/lib/plans.ts`](../src/lib/plans.ts), and [`../src/lib/deload.ts`](../src/lib/deload.ts) implement plan lifecycle and deload math.
- [`../src/lib/exercise-management.ts`](../src/lib/exercise-management.ts) keeps name-based plan references synchronized when an exercise changes.
- [`../src/lib/pr-vault.ts`](../src/lib/pr-vault.ts) owns PR updates, filters, ordering, and chart domains; [`../src/pages/PRVault.tsx`](../src/pages/PRVault.tsx) renders them.

## 2. Domain types and the ID-versus-name seam

TypeScript interfaces describe required and optional fields but disappear at runtime. They are closer to Python `TypedDict` definitions than dataclasses: they help the checker, but imported JSON still needs explicit validation.

An `Exercise` has a stable `id`, display `name`, muscle group, global fallback `sets`, a reps label, sparse current `logs`, optional `lastLogs`, and optional recommended values. Sparse means `logs[1]` can be `undefined`; JSON represents that hole as `null`, and normalization converts it back. A `SetLog` stores numeric weight/reps plus `completed`.

A `TrainingPlan` has identity and progress (`durationWeeks`, `currentWeek`, `currentDay`), a seven-key schedule, optional auto-increment and deload metadata, and optional `exerciseSetCounts`. `currentDay` is a one-based counter across the whole plan, not a weekday number. Day 9 maps to Tuesday with `(9 - 1) % 7`.

The important schema seam is this:

- Exercises are entities identified by `Exercise.id`.
- PRs carry both `exerciseId` and a denormalized `exerciseName`.
- Plan schedules contain exercise **names**, not IDs.
- Per-plan set counts are keyed by normalized exercise **names**.
- Drafts use plan ID, plan day, exercise ID, and set index.

This is why a rename is not a one-field update. [`saveManagedExerciseEdits`](../src/lib/exercise-management.ts) uppercases and trims the new name, rejects a normalized duplicate, changes the `Exercise`, rewrites matching names in every plan day, renames set-count keys, rebuilds counts, and updates matching PR display names by ID. Deletion removes the entity, all schedule occurrences, its set-count key, and PR records; `App.handleDeleteExercise` separately removes its drafts.

`PR` stores the all-time maximum in `weight`/`date` and a capped activity series in `history`. History is not “new records only”: each completed non-deload workout appends that workout's heaviest completed set, even if it is below the record.

`Settings` controls units, vibration, match weight, and rest-day display. The optional [`Workout`](../src/types.ts) interface is currently unused; do not treat it as a central aggregate. The real aggregate is `WorkoutState` in [`workout-storage.ts`](../src/lib/workout-storage.ts).

## 3. Startup and canonical storage

`App` calls `loadWorkoutState(() => window.localStorage, createFreshWorkoutState())` once behind a ref. The ref matters under React `StrictMode`, which can probe rendering more than once in development. The loaded result seeds state, a storage handle, warning UI, and `recoveryLocked`.

Startup follows this decision tree:

1. If storage access throws, return in-memory defaults plus `STORAGE ACCESS FAILED`; lock recovery.
2. If `workout_state_v1` exists, enforce the 2 MiB limit, JSON version `1`, complete normalization, and draft validation. Valid data wins. Invalid data yields safe defaults plus a recovery error; legacy keys are not consulted because a canonical snapshot exists.
3. If no canonical snapshot exists, read the six legacy keys. Missing keys use defaults. Any present malformed or excessive value makes recovery fail rather than silently overwriting it.
4. A valid legacy state is returned immediately and written to `workout_state_v1`. A migration write failure is a save warning, not a load failure, so usable legacy data remains in memory.
5. With no saved data at all, return fresh defaults without forcing an initial write.

The canonical envelope contains exercises, PRs, plans, active plan ID, settings, and drafts in one JSON string. A state-changing render triggers one effect that validates and calls one `setItem`. This is “atomic” at the application-state level: readers cannot observe exercises from one save and plans from another. It is not a multi-version database transaction or journal.

The first effect run is skipped because startup already loaded or migrated state. Autosave is also blocked while recovery is locked, preventing unreadable saved bytes from being overwritten by fallback defaults. A normal save failure leaves edits in React memory and offers retry plus export of pending edits.

Fresh install and wipe are deliberately not identical in the current code. Fresh defaults clone [`INITIAL_EXERCISES`](../src/constants.ts), whose set counts are 5, 4, 3, and 4. Wipe clones the same exercises but changes every `sets` value to 2. Both clear plans, PRs, active plan, and drafts and restore default settings (`lbs`, haptics on, match weight on, rest days off).

## 4. Logging a set: generated values, drafts, and priorities

The home route derives `activePlan`, a clamped progress snapshot, weekday, week, schedule entry, and ordered exercises. [`buildTodayExercises`](../src/lib/today-exercises.ts) preserves schedule order, removes duplicate names, joins by exact name, and silently skips missing entities.

The next-set source priority is:

1. A completed `exercise.logs[index]` is authoritative.
2. An unfinished draft with source `manual` or `propagated` overrides a generated field.
3. Otherwise generate from the corresponding `lastLogs[index]` when completed.
4. Otherwise use `recommended`, or zero when absent.

Auto-increment changes **reps**, not weight. If a corresponding last log exists, its reps gain 1. Without one, recommended reps gain `currentWeek - 1`. The generated weight passes through deload adjustment. `getNextSetInfo` then rounds generated weight to the nearest quarter with `Math.round(weight * 4) / 4`.

Concrete trace: recommended bench is `225 x 5`, week 3, auto-increment on, and no prior set-0 log. The generated value is `225 x 7`. If set 0 last time was `230 x 6`, it becomes `230 x 7`; week number no longer adds another two. In a final deload week, `230 * 0.75 = 172.5`. A value such as `81 * 0.75 = 60.75` already lies on a quarter; other generated values are quarter-rounded by the next-set helper.

Deload applies only when `deload.enabled` and `week === plan.durationWeeks`. It multiplies weight by 0.75 without whole-number rounding and calculates sets as `max(1, ceil(baseSets * 0.75))`. Thus 5 sets become 4, 4 become 3, and 1 remains 1. A deload-enabled “4-week” plan is saved as five total weeks: four base weeks plus a final deload week.

On the exercise screen, each field also remembers why it has its value: `default`, `manual`, or `propagated`. Defaults are not persisted as drafts. With match weight on, manually entering 100 at set 0 propagates 100 to later incomplete sets unless a later set's weight source is already `manual`. If set 2 was manually set to 110, changing set 0 to 105 updates propagatable set 1 but preserves set 2 at 110. Reps never propagate.

Draft keys serialize `[planId, planDay, exerciseId, setIndex]`. This prevents a half-entered value for plan A/day 1 from leaking into plan A/day 8 or another plan. Drafts survive navigation and reload because they are in the canonical snapshot. They are pruned to the current workout's incomplete, in-range sets whenever plan/day/exercise state changes. Logging a set removes that set's draft; completing a day clears all drafts; restarting/deleting a plan and deleting an exercise remove the relevant subset.

`handleLogSet` writes only a completed log, removes its draft, and, when haptics are enabled and `navigator.vibrate` exists, requests a 12 ms vibration. It does **not** update PRs. `handleUnlogSet` replaces the slot with `undefined`. The “LOG NEXT SET” button resolves the next incomplete index, then applies a draft over generated defaults before calling the same handler.

Adding/removing sets has two scopes. If the exercise appears anywhere in the active plan, the handler changes that plan's name-keyed count between 1 and 100. Otherwise it changes the global `Exercise.sets`; global removal also slices current and last logs. This supports plan-specific volume but increases the consequences of name coupling.

Unit toggling converts recommended weights, current logs, last logs, PR maximum/history, and draft weights. Pounds-to-kilograms uses `0.453592`; kilograms-to-pounds uses `2.20462`; every result rounds to one decimal. Repeated toggles can therefore introduce small round-trip drift. The setting labels stored numbers; there is no separate canonical base unit.

## 5. Completing a workout and advancing a plan

Completion is the integration point. `handleCompleteWorkout` re-reads the active plan and its actual `currentDay`, gets a local calendar date, and performs four logical updates:

```tsx
// Actual excerpt, App.tsx; outer indentation normalized
setPrs(prevPrs =>
  applyWorkoutPrUpdates({
    prs: prevPrs,
    exercises,
    completedExerciseNames: currentTodayExerciseNames,
    date: today,
    plan: currentActivePlan,
    week: currentWeek,
  })
);
```

The following statements call `completeWorkoutExercises`, map the active plan through `advancePlanProgress`, clear drafts, and scroll to the top. React queues the functional state updates into the shared state object; the later persistence effect saves the resulting packet.

For each scheduled exercise with at least one completed log, PR integration finds the maximum completed weight. On a first entry it creates the PR. On later entries it always appends `{weight, date}` to history, drops the oldest item beyond 60, and changes the record weight/date only when the maximum is strictly greater. The entire update is skipped in a deload week. Existing PR lookup currently compares exercise names case-insensitively rather than using `exerciseId`, a legacy-oriented tradeoff that makes correct rename synchronization important.

Next, only today's scheduled exercises roll over. When `exercise.logs.length > 0`, `completeWorkoutExercises` replaces `lastLogs` with `exercise.logs.map(...)`: completed slots are copied, incomplete slots become holes, and then `logs` becomes empty. It does not merge a prior `lastLogs` tail. For example, if old `lastLogs` had five entries but the current sparse `logs` array ends at index 2, prior entries at indexes 3 and 4 are lost. That is a current edge case, not intended preservation behavior. If `logs` is empty, the old `lastLogs` is retained. Exercises from other days retain their logs. Matching today's exercises is also exact-name based.

Finally, progress advances. A two-week plan has valid days 1 through 14; completion moves day 14 to sentinel day 15, at which point `isPlanComplete` is true. Display helpers clamp it back to day 14/week 2/100% so the UI does not show a fictitious day.

Rest behavior depends on `includeRestDays`. When true, completion advances exactly one day and rest days render a “complete day” button. When false (the default), `advancePlanProgress` advances once and loops over consecutive rest entries until a workout or completion sentinel. Example: Monday day 1 workout, Tuesday rest, Wednesday workout. Completing Monday moves directly to day 3. If Friday day 5 is the final workout of a one-week plan and Saturday/Sunday are rests, it advances through them to day 8 and completes. Turning rest days off also immediately calls `skipRestDays` for the active plan if it is currently parked on rest.

## 6. Plan CRUD and exercise management

The plan editor keeps temporary React state for name, base duration, seven schedule days, auto-increment, deload, and muscle labels for newly introduced exercises. Exercise names are trimmed and uppercased. Suggestions match normalized substrings. Saving creates an ID or preserves the edited ID, adds the optional deload week, and passes the plan to `handleSavePlan`.

Creation builds missing set-count entries with a default of 2, appends the plan, makes it active only if no plan is active, and creates any missing `Exercise` entities with 2 sets and `8-15` reps. Editing preserves progress: [`mergePlanEdits`](../src/lib/plans.ts) clamps the prior day to the new duration, recomputes week, preserves counts for still-scheduled names, gives new names 2, and drops removed keys. If an edit ID somehow no longer exists, the current handler appends it as a plan.

Restart asks for confirmation, sets week/day to 1, rebuilds every scheduled exercise's count to 2, and removes drafts for that plan. This means restart resets customized per-plan set counts, but it does not erase exercise logs or PRs. Delete asks for confirmation, removes the plan, clears active selection only when deleting the active plan, and removes its drafts. Selecting another plan directly changes `activePlanId`; the draft-pruning effect then keeps only contexts valid for the newly active workout.

Exercise rename and delete were covered earlier because they expose the schema boundary. One further detail: PR muscle filtering resolves muscle by exercise ID first, then name, then `Other`, so an orphaned old PR can still display under a fallback group.

## 7. PR Vault: filters, dates, and charts

PR filters are derived from muscle groups actually represented by current PRs; `ALL` is a convenience control, not a stored category. Initial selection includes every available group. Clicking `ALL` while all are selected clears the selection; otherwise it selects all. An empty selection intentionally displays no cards. Reconciliation preserves a user's partial selection as available groups change, but if all old groups were selected, newly appearing groups are selected too.

Visible PRs sort by latest activity across both `pr.date` and every history entry, newest first, then exercise name and ID for deterministic ties. Because generated dates are fixed-width `YYYY-MM-DD`, lexical comparison works. Validation, however, only bounds date strings to 64 characters; it does not prove they are real ISO calendar dates, so a hand-edited but bounded backup can distort ordering.

Dates come from [`getLocalCalendarDateString`](../src/lib/local-date.ts), which uses `getFullYear()`, `getMonth()`, and `getDate()`. That is local device time, deliberately avoiding the UTC-day shift that `toISOString().slice(0, 10)` can cause near midnight. Backup `exportedAt` is different: it is a UTC ISO timestamp from `new Date().toISOString()`. Filenames use the local date. A PR card shows “NEW PR” when the record date equals today's local date; an ordinary history entry does not move that record date.

Charts use Recharts with animation disabled. [`getPrChartDomain`](../src/lib/pr-vault.ts) avoids a zero-based axis that would flatten small changes. It chooses a minimum visible range based on maximum weight (2, 5, 10, or 20), pads by at least 25% of that minimum, centers around observed min/max, and shifts upward if the lower bound would be negative. For a single 225 point, the minimum range is 10 and padding 2.5. The domain is `225 +/- (10 / 2 + 2.5)`, producing `[217.5, 232.5]`. The chart therefore communicates local progress, not absolute magnitude from zero.

## 8. Backup validation, commit, recovery, and migration

Import treats parsed JSON as `unknown`. The file is rejected before reading if its reported size exceeds 2 MiB; text is byte-checked again after reading. Validators require bounded arrays and text, finite numbers, positive integer set counts, exactly seven schedule keys, coherent deload metadata, and bounded progress. Limits include 1,000 exercises, 1,000 PR records, 100 plans, 100 logs/sets, 520 weeks, 100 scheduled exercises per day, and 60 PR history entries. Missing old `primaryMuscle` becomes `Other`; missing `includeRestDays` becomes `false`; missing PRs become `[]`; a missing plan set-count map is rebuilt. An active plan ID that references no imported plan is normalized to `null`.

Import is commit-before-adopt. `commitImportedWorkoutState` adds empty drafts, normalizes again, and writes the canonical snapshot. Only after `setItem` succeeds does `App` replace React state. Thus quota/storage failure cannot leave the screen showing data that was never saved. Imported backups intentionally discard unfinished drafts because normal exports exclude them.

Wipe uses the same ordering: save the replacement snapshot first, then adopt it. After successful canonical save it attempts to remove every legacy key. Legacy cleanup failure is reported but does not undo the successful wipe. Normal export validates current state, excludes drafts, and emits a re-importable version-1 object. Raw recovery export is different: it packages the untouched canonical and legacy strings so corrupted material can be preserved for diagnosis; it is not a normal backup shape.

When canonical startup data is unreadable, `recoveryLocked` suppresses autosave and the banner offers four deliberate choices: retry load, export raw saved data, overwrite saved data with current in-memory fallback, or export current in-memory data. A failed operation leaves the lock unchanged. Successful import, wipe, overwrite, or retry-load unlocks it. `skipNextSaveRef` prevents an immediately adopted import/wipe/reload state from being redundantly saved on the next effect.

Legacy draft migration expects `{version: 1, drafts: [...]}` under `workout_drafts`. Valid drafts join the migrated complete state and are saved inside `workout_state_v1`. Once canonical data exists, legacy keys are no longer authoritative. Migration does not eagerly delete them; explicit wipe performs cleanup.

## 9. Tradeoffs and limitations to remember

- [`../src/App.tsx`](../src/App.tsx) is an integration hub but also a large multi-screen file. Local helpers reduce logic duplication, yet state wiring remains costly to survey and test as a unit.
- The name-based plan schema is readable in exported JSON but creates referential-integrity work and exact-name joins. IDs would reduce rename coupling, at migration cost.
- Runtime interfaces alone provide no safety; the strict normalization layer is essential. Some semantic checks remain permissive, notably date syntax and non-negative constraints for persisted log weights/reps.
- One canonical `localStorage` write prevents partial multi-key saves, but there is no journal, previous-good snapshot, encryption, cloud sync, or cross-device merge.
- Units are destructive conversions rounded to tenths, not presentation conversions from a canonical value.
- Drafts preserve explicit intent with source tags, but normal backup intentionally omits them.
- PR history measures heaviest completed weight per completed workout, not estimated one-rep max, rep quality, or volume. Deload sessions are excluded entirely.

## 10. Exercises

1. An exercise recommends `80 x 10`. It is week 4 with auto-increment on, no `lastLogs[1]`, and set 1 has a manual draft `75 x 12`. What values are logged by “LOG NEXT SET” if set 1 is next?
2. A plan has Monday workout, Tuesday and Wednesday rest, Thursday workout. It is on Monday and rest days are off. What stored day follows completion? What if rest days are on?
3. A PR is 225 dated October 20 with 59 history entries. On October 23 the completed workout's heaviest bench set is 220. What changes?
4. Why must exercise rename touch both ID-based and name-based records?
5. Canonical JSON exists but is malformed; valid legacy keys also exist. Which data appears, and why does autosave not destroy either source?

### Answer key

1. Generated defaults would be `80 x 13`, but the manual draft wins field by field, so `75 x 12` is logged. Auto-increment does not override explicit draft input.
2. Rest days off skips days 2 and 3 and stores day 4. Rest days on stores day 2 and waits for explicit rest-day completion.
3. The record stays 225 dated October 20. `{weight: 220, date: 2026-10-23}` is appended; with 60 entries total nothing is removed. A 61st entry would remove the oldest.
4. The entity and PR association use IDs, plans and set-count maps use names, and PRs also cache the display name. Leaving any copy stale breaks schedule joins, volume lookup, or display consistency.
5. Safe fresh defaults appear with a recovery warning. Canonical presence takes precedence, so startup does not fall back to legacy data. `recoveryLocked` blocks the save effect until the user explicitly recovers or overwrites.

## Source index

- App integration and handlers: [`../src/App.tsx`](../src/App.tsx)
- Persisted types and seeded data: [`../src/types.ts`](../src/types.ts), [`../src/constants.ts`](../src/constants.ts)
- Startup, canonical persistence, migration, commit, wipe, recovery: [`../src/lib/workout-storage.ts`](../src/lib/workout-storage.ts)
- Backup schema normalization and defaults: [`../src/lib/backup.ts`](../src/lib/backup.ts)
- File read boundary and resource limits: [`../src/lib/backup-file.ts`](../src/lib/backup-file.ts), [`../src/lib/data-limits.ts`](../src/lib/data-limits.ts)
- Logging inputs and next-set calculation: [`../src/lib/exercise-log-inputs.ts`](../src/lib/exercise-log-inputs.ts), [`../src/lib/next-set-info.ts`](../src/lib/next-set-info.ts), [`../src/lib/exercise-progress.ts`](../src/lib/exercise-progress.ts)
- Draft identity and lifecycle: [`../src/lib/workout-drafts.ts`](../src/lib/workout-drafts.ts)
- Plan progression, CRUD helpers, and deload: [`../src/lib/plan-progress.ts`](../src/lib/plan-progress.ts), [`../src/lib/plans.ts`](../src/lib/plans.ts), [`../src/lib/plan-editor.ts`](../src/lib/plan-editor.ts), [`../src/lib/deload.ts`](../src/lib/deload.ts)
- Workout rollover and schedule join: [`../src/lib/workout-completion.ts`](../src/lib/workout-completion.ts), [`../src/lib/today-exercises.ts`](../src/lib/today-exercises.ts)
- Exercise rename/delete integrity: [`../src/lib/exercise-management.ts`](../src/lib/exercise-management.ts)
- PR integration, filtering, sorting, and chart math: [`../src/lib/pr-vault.ts`](../src/lib/pr-vault.ts), [`../src/pages/PRVault.tsx`](../src/pages/PRVault.tsx)
- Local date semantics and muscle tags: [`../src/lib/local-date.ts`](../src/lib/local-date.ts), [`../src/lib/exercise-tags.ts`](../src/lib/exercise-tags.ts)
