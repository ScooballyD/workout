# Rest Days Setting Design

## Goal

Let users choose whether scheduled rest entries appear as explicit plan days. The preference is disabled by default, so normal workout completion advances directly to the next scheduled workout.

## Persisted Setting

Add `includeRestDays: boolean` to `Settings` with a default of `false`. Local-storage parsing and backup import normalization must accept older settings objects that omit this field and supply `false`; malformed provided values remain invalid.

## Progression Rules

Keep schedule traversal in `src/lib/plan-progress.ts`.

- With `includeRestDays: true`, preserve the current behavior: completing a workout advances exactly one calendar day, including to a rest entry.
- With `includeRestDays: false`, advance once and then skip every consecutive rest entry until reaching a workout entry or the first day after the plan duration.
- Skipping crosses week boundaries and completes the plan safely when no future workout entry exists.
- Toggling the setting from enabled to disabled immediately reconciles the active plan only when it is currently on a rest entry. It advances to the next workout entry or completion.
- Do not advance a plan merely because the app launches on a rest entry. Automatic skipping occurs after workout completion and when the setting changes from enabled to disabled.

## User Interface

Add a `REST DAYS` switch in the existing Settings Preferences section using the same accessible button and visual pattern as `HAPTIC FEEDBACK` and `MATCH WEIGHT`. Its enabled state means rest entries are shown and must be completed individually.

## Verification

- Add focused helper tests for consecutive rest days, week-boundary skipping, final-plan completion, and enabled one-day advancement.
- Add settings/backup tests proving fresh state defaults to `includeRestDays: false`, legacy stored settings and backups normalize to false, and an explicit boolean is preserved.
- Run `npm test`, `npm run lint`, `npm run build:android:web`, and `npm run sync:android`.
- On the connected Android device, validate default skip-after-workout behavior, enabled rest-day behavior, and immediate reconciliation after disabling the setting while on a rest day.
