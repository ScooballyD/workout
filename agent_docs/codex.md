# Codex Notes

Use this file as repo memory. Read it before changing persistence, plan lifecycle logic, PWA/build config, or shared UI state. It records concrete things that have broken in this codebase, why they broke, and the current safe pattern so future agents do not reintroduce the same regressions.

If you discover and fix a new repository-specific failure pattern, add it here before finishing the task.

## 1. Backup Import Must Stay Strict

### Issue

Importing malformed backup JSON used to poison runtime state.

### Failure mode

The app would accept top-level backup keys and cast them straight into state. Bad shapes for `plans`, `exercises`, or `settings` could be written into local storage, and later renders would fail because code assumed arrays and objects had the expected shape.

### Root cause

Backup import trusted presence of keys instead of normalizing and validating the full payload.

### Current safe pattern

Use the normalization and validation boundary in [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts). Treat imported data as `unknown` until it passes `validateImportedBackup` / `parseImportedBackupFile`. When changing persisted types, update:

- `src/types.ts`
- `src/lib/backup.ts`
- any relevant storage tests

Keep older stored data/backups valid through backward-compatible normalization whenever possible.

### Verify before calling it fixed

- Import a valid backup
- Import an invalid backup
- Reload the app after import
- Confirm the app still renders and local storage is not poisoned

## 2. Exercise Logs Are Sparse Arrays Now

### Issue

Unlogging a set used to keep stale weight/reps around and feed the next session incorrect defaults.

### Failure mode

A user could log a set, unlog it, complete the workout, and still see the abandoned weight/reps reused later because the slot still existed in `logs` / `lastLogs`.

### Root cause

The code treated logs as dense arrays and toggled `completed` instead of clearing the entry.

### Current safe pattern

`Exercise.logs` and `Exercise.lastLogs` are arrays of `SetLog | undefined`. Unlogging clears a slot instead of leaving a stale value behind. Any code reading logs must tolerate sparse entries and should usually check `log?.completed`.

Pay special attention in:

- [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx)
- [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts)
- exercise-log helper modules

### Verify before calling it fixed

- Log a set
- Unlog it
- Complete the workout
- Confirm the next session does not reuse the abandoned values

## 3. Match-Weight Propagation Is Easy To Regress

### Issue

With `MATCH WEIGHT` enabled, later set inputs have regressed multiple times after state sync or set logging.

### Failure mode

Changing a weight updates later unfinished sets in the UI, but logging the edited set can revert those later weights if the sync/default logic is too aggressive.

### Root cause

The controlled input state and the “rebuild defaults from exercise state” logic can fight each other if the draft input state is not preserved correctly.

### Current safe pattern

Treat the exercise-log input helpers as the source of truth for draft behavior:

- [src/lib/exercise-log-inputs.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/exercise-log-inputs.ts)
- [src/lib/next-set-info.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/next-set-info.ts)
- [src/lib/exercise-progress.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/exercise-progress.ts)

When changing log-input behavior, verify both temporary draft updates and post-log persistence. Do not patch JSX handlers alone without checking the helper layer.

### Verify before calling it fixed

- Enable `MATCH WEIGHT`
- Change set 1 weight
- Confirm later unfinished sets update
- Log set 1
- Confirm later unfinished sets keep the updated value

## 4. Plan Schema Changes Must Be Explicit And Backward Compatible

### Issue

Features like plan editing, restart logic, and optional deload weeks can easily break old saved plans or imported backups.

### Failure mode

A new plan field can make older plans fail normalization, or a runtime-only flag can diverge from persisted plan behavior.

### Root cause

Plan lifecycle behavior touches several places: types, storage normalization, UI, helper modules, and progress calculations.

### Current safe pattern

Treat plan changes as schema changes. Update all of these together when needed:

- [src/types.ts](C:/Users/carve/OneDrive/Projects/workout/src/types.ts)
- [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts)
- [src/lib/plan-progress.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plan-progress.ts)
- [src/lib/plans.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plans.ts)
- [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx)

For deload specifically, the current safe pattern is explicit persisted metadata on the plan rather than inferring it from week count alone.

### Verify before calling it fixed

- Load existing saved plans
- Import an older backup
- Create a new plan
- Advance/restart/edit/delete the plan as relevant

## 5. PR Vault Filters Must Stay Data-Driven

### Issue

The PR Vault originally used hard-coded filter buttons and later changed to data-driven, multi-select filters.

### Failure mode

Hard-coded categories can show filters that have no backing data, and filter behavior can regress if `ALL` or empty-selection semantics are changed casually.

### Root cause

The page UI and filter semantics were previously mixed together.

### Current safe pattern

Keep selection and filtering semantics in the helper layer and keep the page driven by real PR data:

- [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx)
- [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts)

Remember:

- filters come from existing PR data
- multiple filters can be selected
- `ALL` is a convenience toggle, not a normal exclusive filter
- empty selection behavior is meaningful and should not be changed casually

### Verify before calling it fixed

- One selected filter
- Multiple selected filters
- `ALL` selecting everything
- `ALL` clearing everything
- No-data PR Vault state

## 6. PR Vault Charts Need Relative, Not Flat, Scaling

### Issue

Heavy lifts looked visually flat while lighter lifts looked exaggerated.

### Failure mode

Charts failed to communicate useful progress because raw values alone produced poor visual scaling across exercises with different weight ranges.

### Root cause

A generic chart domain can hide meaningful movement when absolute values vary too widely.

### Current safe pattern

Keep chart-domain logic centralized in the PR Vault helper layer rather than hard-coding chart math in the page:

- [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx)
- [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts)

When changing chart scaling, validate against both light and heavy PR histories.

### Verify before calling it fixed

- Short history
- Flat history
- Light-weight progression
- Heavy-weight progression

## 7. PWA Base Paths Can Break Subpath Deployments

### Issue

The app previously assumed root deployment for manifest and icon paths.

### Failure mode

Installability or offline launches break when the app is hosted under a subpath instead of `/`.

### Root cause

Manifest `start_url`, `scope`, and icon URLs were effectively root-only.

### Current safe pattern

Preserve the base-aware manifest handling in [vite.config.ts](C:/Users/carve/OneDrive/Projects/workout/vite.config.ts), especially the `syncPwaManifestBase` plugin and relative manifest icon setup. Do not undo those changes casually.

### Verify before calling it fixed

- Run `npm run build`
- Inspect generated `dist/manifest.webmanifest`
- Confirm `start_url`, `scope`, and icon URLs respect the configured base path

## 8. Capacitor Android Back Must Follow Router History

### Issue

Android system back used to exit Megalifts from nested React Router screens instead of returning to the prior in-app route.

### Failure mode

Users lost the current workout flow when pressing Android back from exercise detail, Plans, PR Vault, or Settings. React Router history is not consumed automatically by Capacitor without an App-plugin listener.

### Current safe pattern

Use the official `@capacitor/app` plugin and mount one Android-only listener inside the router in [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx). Keep route decisions in [src/lib/android-back.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/android-back.ts): use history for nested routes when available, replace-navigate to `/` for direct nested launches, and call `exitApp()` only at `/`.

The listener lifecycle is asynchronous. Keep the current pathname and navigator in refs, serialize listener add/remove operations for React Strict Mode, retry registration failures safely, and block future registration if native listener removal fails. Never use `removeAllListeners`.

### Verify before calling it fixed

- Run `npm test`, `npm run lint`, `npm run build:android:web`, and `npm run sync:android`
- Build the Android debug artifact and install it on a physical device
- Verify exercise-detail system back, toolbar back, each bottom-navigation route, repeated back presses, root exit, and relaunch
- Inspect process Logcat for AndroidRuntime, Capacitor, Chromium, and listener errors

## 9. Workout Drafts Must Preserve Field-Level Sources

### Issue

Exercise Detail edits need to survive navigation and relaunch without being recorded as completed workout logs.

### Failure mode

Persisting route-local input values directly can freeze default values after a user edits a different field. Likewise, Grind can use a stale default from a partial draft if it treats any draft as authoritative for both weight and reps.

### Root cause

Each input field has independent `default`, `manual`, or `propagated` semantics. A draft with manual reps can still have a default-sourced weight, which must be regenerated when the current plan context changes.

### Current safe pattern

Keep unfinished values in the versioned `workout_drafts` storage key through [src/lib/workout-drafts.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/workout-drafts.ts), not in sparse `Exercise.logs` or backups. Persist a draft only when at least one field is manual or propagated. During hydration and Grind's next-set display/log resolution, resolve weight and reps independently: use the draft only for non-default sources and regenerate default-source values from the current plan defaults.

Prune drafts to the active plan/day/exercise/set contexts and clear them after logging, workout completion, plan restart/deletion, exercise deletion, import, and wipe. Convert draft weights whenever units change while preserving source metadata.

### Verify before calling it fixed

- Run focused `workout-drafts`, `exercise-log-inputs`, and `next-set-info` tests
- Run `npm test`, `npm run lint`, `npm run build:android:web`, and `npm run sync:android`
- On Android, edit a partial draft, return to Grind, log it, force-close/relaunch, toggle units, and exercise each cleanup boundary

## 10. OneDrive Reparse Points Can Block Android Packaging

### Issue

Gradle can reject Capacitor-synchronized web assets when the checkout lives in OneDrive.

### Failure mode

`assembleDebug` fails while merging assets with an error that a file under `android/app/src/main/assets/public` is "not a regular file." Deleting and re-syncing that generated directory does not reliably help because OneDrive can recreate its files as reparse points.

### Root cause

Gradle snapshots Android assets as normal files, while OneDrive Files On-Demand may expose freshly generated Capacitor assets as reparse points.

### Current safe pattern

Keep the source checkout in OneDrive if needed, but build a disposable copy outside OneDrive (for example directly under `C:\\`) when this failure occurs. In that copy, run:

- `npm install`
- `npm run build:android:web`
- `npm run sync:android`
- `android\\gradlew.bat assembleDebug`

Install the staged APK with `adb install -r` to preserve on-device test data. Do not commit generated `android/app/build`, `android/build`, or Capacitor asset outputs as a workaround.

### Verify before calling it fixed

- The staged Vite build succeeds
- Capacitor sync succeeds
- Gradle produces `app-debug.apk`
- The APK installs on a physical device and launches normally

## 11. Android Studio's Keytool May Not Be On PATH

### Issue

PowerShell can report that `keytool` is not recognized while preparing Android
release signing.

### Root cause

Android Studio includes a Java runtime with `keytool.exe`, but its `bin`
directory is not necessarily added to the Windows `PATH`.

### Current safe pattern

Use the Android Studio bundled executable explicitly when a global JDK is not
configured:

```powershell
& 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe' -help
```

Do not install another JDK solely for key generation unless Android Studio's
bundled runtime is unavailable.

## Quick Start For Future Agents

Before large or risky work:

1. Read [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. Read [project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. Read this file for known breakpoints
4. Use [plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) if the task is multi-file, persistence-sensitive, PWA-sensitive, or likely to need handoff
