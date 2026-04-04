# Project Guide

## What This Is

Megalifts is a mobile-first workout tracker built with Vite, React, and TypeScript. It is a static Progressive Web App that runs entirely in the browser with no required backend at runtime. User data lives in browser storage on the current device unless the user exports and imports backups manually.

The app is designed around quick phone use:

- open the app and see today’s workout
- log sets for exercises in the active plan
- track PR history over time
- create, select, edit, restart, and delete training plans
- export, import, or wipe local data

## Core User Flows

### Daily workout flow

- The home screen shows the current day of the active plan.
- If there is no active plan, the app shows a no-plan state and sends the user to the Plans screen.
- Workout days render the day’s assigned exercises.
- Logging sets updates exercise logs and can update later set inputs when `MATCH WEIGHT` is enabled.
- Completing a workout advances plan progress and updates PR history from the heaviest completed set for each exercise scheduled that day.

### Plan management flow

- Users can create training plans with workout/rest days.
- Plans track duration, current week, current day, auto-increment behavior, and optional deload settings.
- The Plans screen shows the active plan and the saved plan list.
- Existing plans can now be selected, edited, restarted, or deleted.

### PR tracking flow

- PR history is tracked per exercise.
- The PR Vault screen renders cards with charts and filtering controls based on recorded PR data.

### Settings and backup flow

- Users can switch units between `lbs` and `kg`.
- Users can toggle `MATCH WEIGHT` and `HAPTIC FEEDBACK`.
- Users can export the full app state to JSON.
- Users can import a validated backup JSON file.
- Users can wipe all local data and return the app to defaults.

## Important Files

### Root docs and instructions

- [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md): repo rules for agents
- [plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md): execution-plan rules for large or risky work
- [project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md): quick repo orientation for new agents
- [codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md): durable notes about breakages and safe patterns
- [README.md](C:/Users/carve/OneDrive/Projects/workout/README.md): user-facing repo overview
- [package.json](C:/Users/carve/OneDrive/Projects/workout/package.json): scripts, dependencies, overrides

### App entry and shell

- [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx): main application flow, routes, plan management, settings, workout completion, and persistence wiring
- [src/main.tsx](C:/Users/carve/OneDrive/Projects/workout/src/main.tsx): React bootstrapping and service worker registration
- [vite.config.ts](C:/Users/carve/OneDrive/Projects/workout/vite.config.ts): Vite config, PWA config, manifest behavior, and current dependency hardening assumptions

### Data model and normalization

- [src/types.ts](C:/Users/carve/OneDrive/Projects/workout/src/types.ts): persisted application types
- [src/constants.ts](C:/Users/carve/OneDrive/Projects/workout/src/constants.ts): seeded exercises and PR defaults
- [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts): local-storage normalization and backup import validation

### Domain helpers

- [src/lib/plan-progress.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plan-progress.ts): plan lifecycle/progress helpers
- [src/lib/plans.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plans.ts): edit/restart/delete plan helpers
- [src/lib/deload.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/deload.ts): deload-week logic
- [src/lib/exercise-log-inputs.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/exercise-log-inputs.ts): controlled input behavior for exercise logging
- [src/lib/next-set-info.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/next-set-info.ts): default weight/reps for the next set
- [src/lib/workout-completion.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/workout-completion.ts): exercise log rollover on workout completion
- [src/lib/plan-editor.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plan-editor.ts): create/edit plan helpers and exercise suggestions
- [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts): PR Vault filtering and display helpers

### UI areas

- [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx): PR Vault page
- [src/components/Header.tsx](C:/Users/carve/OneDrive/Projects/workout/src/components/Header.tsx): shared page header

## Persistence Model

All primary data is stored in `localStorage`:

- `workout_exercises`
- `workout_prs`
- `workout_plans`
- `workout_activePlanId`
- `workout_settings`

Backups export and import the same logical state. Import validation is important in this repo because malformed data can break runtime assumptions if it bypasses normalization. Older stored records and backups may not contain newly added fields, so backward-compatible normalization matters whenever the data model changes.

## PWA and Hosting Notes

- Production output is the built `dist/` directory.
- This app is intended for static hosting.
- The app uses `BrowserRouter`, so the host should rewrite unknown routes to `index.html`.
- `vite-plugin-pwa` generates the manifest and service worker at build time.
- Offline support is app-shell focused; user data still depends on browser storage on that device.
- Some PWA and preview flows have required extra care in this repo because Vite/esbuild process spawning can behave differently inside sandboxed environments.

## Development Commands

Run these from the repo root:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

What they do:

- `npm run dev`: local development server
- `npm run lint`: TypeScript typecheck via `tsc --noEmit`
- `npm run build`: production bundle build
- `npm run preview`: local preview of the production bundle

There is also a test script:

```bash
npm test
```

The repo uses Node’s built-in test runner for targeted `.test.ts` files.

## Verification Expectations

For most code changes in this repo, the minimum verification bar is:

- `npm run lint`
- `npm run build`

Also use `npm run preview` when the change affects:

- installability or service worker behavior
- routing
- local-storage or backup behavior
- mobile UI flow that benefits from manual confirmation

For risky or multi-file work, use [plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) and keep the execution plan current as the work progresses.

## Current Constraints and Known Risks

- The app is intentionally static-host friendly. Avoid introducing runtime server assumptions unless explicitly requested.
- Mobile performance matters. Prefer small, local helpers over heavier abstractions or new dependencies.
- Persistence changes are risky. Update normalization and compatibility paths whenever changing stored types.
- PWA changes are risky. Build and preview verification matter whenever changing routing, assets, manifest behavior, or service worker assumptions.
- Agent-facing docs are intentionally split by responsibility. Check `AGENTS.md` for rules, `agent_docs/project.md` for orientation, `agent_docs/codex.md` for repo memory, and `agent_docs/plans.md` for plan-writing standards.

## How To Get Productive Quickly

If you are a new agent entering this repo:

1. Read [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md) for repo rules.
2. Read [package.json](C:/Users/carve/OneDrive/Projects/workout/package.json) and [README.md](C:/Users/carve/OneDrive/Projects/workout/README.md) for commands and current setup.
3. Open [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx) first if the task touches app behavior.
4. Read [codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md) before changing persistence, plan lifecycle logic, PWA/build config, or shared UI state.
5. Read [plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) and create a plan if the task is large, risky, or likely to need handoff.
6. Pay extra attention to backup normalization, local-storage compatibility, and PWA behavior before changing shared state or app lifecycle code.
