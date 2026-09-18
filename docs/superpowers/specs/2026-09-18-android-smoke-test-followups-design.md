# Android Smoke-Test Follow-ups Design

## Context

The first physical-device Capacitor test confirmed that Megalifts builds, installs, launches, and renders on Android. Testing then exposed three runtime/UX regressions and one requested plan-progression preference:

- the empty Training Plans state is narrower than the populated state
- Android system back exits the app from nested routes
- unlogged exercise-detail edits disappear after leaving the route
- users need rest days to be skipped automatically unless they opt into explicit rest-day screens

These concerns cross UI layout, native navigation, transient persistence, and plan progression. They will be implemented and verified sequentially rather than as one shared-state change.

## Agreed Behavior

### Android back navigation

Android system back must navigate out of nested Megalifts routes before exiting. Exercise detail is the primary reproduction case. Root-level back may exit the app. Existing browser/PWA navigation and the on-screen back arrow must remain functional.

### Persistent workout drafts

Manual weight and reps edits are unfinished workout drafts, not completed logs. Drafts must survive route changes and a full app close/relaunch, and the main workout screen must use them when logging the next set. Drafts will use a separate validated local-storage record keyed by plan, plan day, exercise, and set. They will not be exported in backups or written into sparse `Exercise.logs` before logging.

Drafts must be removed or reconciled when their context changes, including set logging, workout completion, unit conversion, plan or exercise deletion/restart, import, wipe, and stale plan-day identity.

### Empty Training Plans layout

The no-plan view must occupy the same available mobile width and use the same outer margins as the populated view. The populated layout and maximum desktop width should not change.

### Rest Days setting

`REST DAYS` is a persisted global setting that defaults to off, including for older stored settings and backups that omit the field. With the setting off, completing a workout immediately skips all consecutive rest entries and lands on the next workout day, or safely completes the plan if no workout remains. With the setting on, the existing explicit rest-day flow remains available. Turning the setting off while currently stopped on a rest entry must reconcile progress to the next workout.

## Execution Order

1. Native-aware Android back navigation
2. Persisted workout draft state shared across workout views
3. Empty Training Plans mobile-width correction
4. Rest Days setting and plan-progress helper behavior
5. Full physical-device Android regression pass
6. Signed tester release and distribution workflow

The first four items receive focused automated coverage where practical. The fifth item is the integration gate and must include force-close/relaunch, offline startup, backup import/export, Android keyboard and scrolling, system back behavior, and Logcat inspection.

## Safety Constraints

- Preserve the sparse completed-log model; drafts are not `SetLog` records.
- Keep legacy saved settings and backups valid.
- Centralize rest-day progression in helper logic instead of route JSX.
- Avoid duplicate native back listeners and preserve web/PWA behavior.
- Rebuild and sync Capacitor assets before every physical-device validation pass.
