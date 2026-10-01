# Rest Days Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted default-off Rest Days setting that skips scheduled rest entries after workout completion and when the setting is disabled on an active rest day.

**Architecture:** Keep progression behavior in `plan-progress.ts`. `advancePlanProgress` advances one calendar day and optionally skips subsequent rest entries; a separate `skipRestDays` helper reconciles a plan already positioned on a rest entry. `App.tsx` supplies the persisted preference to the helper and uses the same setting handler for the mobile toggle and active-plan reconciliation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, Capacitor Android, Node test runner.

---

### Task 1: Make Settings Backward Compatible

**Files:**
- Modify: `src/types.ts:63-67`
- Modify: `src/lib/backup.ts:10-14,367-385`
- Test: `src/lib/backup.test.ts:204-225`

- [x] **Step 1: Write failing settings normalization tests**

Add tests proving a fresh default is off, saved legacy settings gain `includeRestDays: false`, explicit `true` is preserved, and a legacy backup imports successfully with false:

```ts
test('DEFAULT_SETTINGS disables rest days for fresh settings state', () => {
  assert.equal(DEFAULT_SETTINGS.includeRestDays, false);
});

test('normalizeSettings defaults legacy rest-day preference to false', () => {
  assert.deepEqual(normalizeSettings({
    unit: 'lbs', hapticFeedback: true, matchWeight: true,
  }), {
    unit: 'lbs', hapticFeedback: true, matchWeight: true, includeRestDays: false,
  });
});
```

Extend the existing valid backup fixture test by omitting the field and asserting `result.value.settings.includeRestDays === false`; add an explicit `true` case.

- [x] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --test-name-pattern="rest days|legacy"`

Expected: failures because `Settings` and normalization do not yet define `includeRestDays`.

- [x] **Step 3: Add the persisted field and tolerant normalization**

Update the type and default:

```ts
export interface Settings {
  unit: 'lbs' | 'kg';
  hapticFeedback: boolean;
  matchWeight: boolean;
  includeRestDays: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lbs', hapticFeedback: true, matchWeight: true, includeRestDays: false,
};
```

In `normalizeSettings`, retain strict checks for the three existing required fields. Read `value.includeRestDays`; reject it when present but not boolean, and otherwise return `false` when it is absent:

```ts
const includeRestDays = value.includeRestDays;
if (includeRestDays !== undefined && typeof includeRestDays !== 'boolean') return null;
return { unit: value.unit, hapticFeedback: value.hapticFeedback, matchWeight: value.matchWeight, includeRestDays: includeRestDays ?? false };
```

- [x] **Step 4: Run focused settings tests**

Run: `npm test -- --test-name-pattern="rest days|legacy"`

Expected: all matching settings and backup tests pass.

### Task 2: Centralize Rest-Day Traversal

**Files:**
- Modify: `src/lib/plan-progress.ts:1-39`
- Test: `src/lib/plan-progress.test.ts:29-70`

- [x] **Step 1: Write failing progress tests**

Add tests covering all required cases:

```ts
test('advancePlanProgress skips consecutive rest days when rest days are disabled', () => {
  const next = advancePlanProgress(createPlan({ currentDay: 1 }), false);
  assert.equal(next.currentDay, 3);
  assert.equal(next.currentWeek, 1);
});

test('skipRestDays crosses a week boundary to the next workout', () => {
  const next = skipRestDays(createPlan({ currentDay: 6 }));
  assert.equal(next.currentDay, 8);
  assert.equal(next.currentWeek, 2);
});
```

Also test that disabled progression completes a one-week plan after its final workout, and `advancePlanProgress(plan, true)` still advances exactly one day to a rest entry.

- [x] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --test-name-pattern="skip|rest days|one day"`

Expected: failures because the helper signature and `skipRestDays` export do not yet exist.

- [x] **Step 3: Implement bounded schedule traversal**

Add a local `getScheduleEntry(plan, day)` based on the existing Monday-through-Sunday ordering. Refactor one-day movement into an internal bounded helper that preserves the existing complete-plan behavior. Export:

```ts
export const skipRestDays = (plan: TrainingPlan): TrainingPlan => {
  let next = plan;
  while (!isPlanComplete(next) && getScheduleEntry(next, next.currentDay)?.type === 'rest') {
    next = advanceOneDay(next);
  }
  return next;
};

export const advancePlanProgress = (
  plan: TrainingPlan,
  includeRestDays = true
): TrainingPlan => {
  const next = advanceOneDay(plan);
  return includeRestDays ? next : skipRestDays(next);
};
```

Keep `advanceOneDay` idempotent for completed plans and never traverse beyond `durationWeeks * 7 + 1`.

- [x] **Step 4: Run focused progress tests**

Run: `npm test -- --test-name-pattern="skip|rest days|one day|configured duration"`

Expected: all progression tests pass, including the prior completion tests.

### Task 3: Connect The Preference To Mobile Flow

**Files:**
- Modify: `src/App.tsx:66,1431-1524,1960-1972`

- [x] **Step 1: Add the Rest Days switch**

Add `onToggleRestDays` to `SettingsPage` props. Render a `REST DAYS` row immediately after `MATCH WEIGHT`, using the existing button classes and `settings.includeRestDays` for its state. Its click handler calls `onToggleRestDays`, not `setSettings` inline.

- [x] **Step 2: Implement the setting handler and active-rest reconciliation**

Import `skipRestDays`. In `App`, create `handleToggleRestDays`:

```ts
const handleToggleRestDays = () => {
  const includeRestDays = !settings.includeRestDays;
  setSettings((current) => ({ ...current, includeRestDays }));
  if (!includeRestDays) {
    setPlans((currentPlans) => currentPlans.map((plan) =>
      plan.id === activePlanId ? skipRestDays(plan) : plan
    ));
  }
};
```

Pass it to `SettingsPage`. The helper leaves workout entries and completed plans unchanged, so this reconciles only an active rest entry.

- [x] **Step 3: Use the preference after workout completion**

Replace the existing `advancePlanProgress(p)` call in `handleCompleteWorkout` with:

```ts
advancePlanProgress(p, settings.includeRestDays)
```

Do not alter PR updates, log cleanup, draft cleanup, app startup behavior, or the current enabled rest-day rendering.

- [x] **Step 4: Run static and production checks**

Run:

```powershell
npm test
npm run lint
npm run build:android:web
npm run sync:android
```

Expected: all tests pass, TypeScript is clean, the production bundle builds, and Capacitor sync succeeds.

### Task 4: Validate Android And Complete Tracking

**Files:**
- Modify: `todo.md`
- Modify: `docs/superpowers/plans/2026-09-19-rest-days-setting.md`

- [x] **Step 1: Build and install the debug APK**

Run:

```powershell
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
Push-Location android; .\gradlew.bat assembleDebug; Pop-Location
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Expected: the device installs the current feature build without clearing app data.

- [x] **Step 2: Exercise the three device flows**

On a plan containing at least one workout followed by consecutive rest entries:

1. Leave `REST DAYS` disabled, complete the workout, and confirm Grind opens the next workout day.
2. Enable `REST DAYS`, complete a workout before a rest entry, and confirm Grind opens that rest day; complete it and confirm one-day progression continues.
3. While positioned on a rest day, disable `REST DAYS` and confirm Grind immediately shows the next workout or completion screen.

Confirm a close and relaunch does not advance a rest day by itself.

- [x] **Step 3: Update plan and todo tracking**

Mark completed plan steps with verification evidence. Remove task 1 from `todo.md`, renumber remaining tasks, and append:

```md
7. [P2] Rest-day handling is now a default-off persisted setting that automatically skips scheduled rest entries after workouts and when disabled on an active rest day, while retaining the optional explicit rest-day flow.
```

- [x] **Step 4: Commit the focused implementation after integration approval**

Stage only changed source, tests, plan, specification, and `todo.md`, then commit:

```powershell
git add src/types.ts src/lib/backup.ts src/lib/backup.test.ts src/lib/plan-progress.ts src/lib/plan-progress.test.ts src/App.tsx todo.md docs/superpowers/specs/2026-09-19-rest-days-setting-design.md docs/superpowers/plans/2026-09-19-rest-days-setting.md
git commit -m "Add configurable rest day handling"
```

## Outcome

- Added `includeRestDays`, defaulting legacy local storage and backups to `false` while retaining strict validation for supplied values.
- Default progression skips consecutive rest entries; enabled progression remains one calendar day at a time; disabling the setting reconciles an active rest entry immediately without changing startup behavior.
- Verified on Android: default-off skipped Days 2-3 to Day 4, enabled mode showed Day 6 rest, relaunch preserved the selected rest day, and disabling reconciled to Day 8 Monday workout. `npm test` (103 passing), `npm run lint`, `npm run build:android:web`, `npm run sync:android`, debug APK assembly/install, and a Logcat runtime-error scan passed.
