# Megalifts

Megalifts is a mobile-first workout tracker built with Vite, React, and TypeScript. It runs entirely in the browser as a static Progressive Web App, with no required backend at runtime.

## Current App Behavior

- The app opens to the current day of the active training plan. If no plan is active, the home screen prompts you to create or select one.
- Training plans are weekly schedules made up of workout and rest days. A plan also tracks its current week, current day, and whether auto-increment is enabled.
- Completing a workout clears the current day's working logs, copies completed sets into `lastLogs`, advances the active plan's day counter, and updates PR history using the heaviest completed set for each exercise assigned to that day.
- PR history is tracked per exercise and capped at 60 history entries.
- The settings screen currently lets the user:
  - Toggle units between `lbs` and `kg` and convert stored weights
  - Toggle `matchWeight` so changing one set's weight can fill later unfinished sets for that exercise
  - Toggle `hapticFeedback` in stored settings
  - Export, import, or wipe app data
- The app seeds a starter exercise list, but it does not ship with an active training plan.

## Data and Backup Flow

All app data is stored locally in browser `localStorage`. There is no account system, cloud sync, or automatic remote backup.

The export flow writes a JSON file named like `workout-backup-YYYY-MM-DD.json`. The backup payload currently contains:

- `exercises`
- `prs`
- `plans`
- `activePlanId`
- `settings`
- Metadata fields such as `version` and `exportedAt`

The import flow reads a JSON file in the browser, validates its structure, and then replaces the current in-browser data with the imported snapshot. It does not merge records.

If the imported backup references an active plan that no longer exists in the imported plan list, the app clears the active plan selection instead of keeping an invalid reference.

The wipe flow is destructive. It resets the app to the built-in starter state:

- Restores the initial exercise seed list
- Clears PRs
- Clears saved plans
- Clears the active plan
- Resets settings to defaults

## Deployment and Runtime Assumptions

- Production output is the built `dist/` directory.
- The app is intended for static hosting. No runtime server logic is required.
- Because routing uses `BrowserRouter`, the host should rewrite unknown app routes to `index.html` so deep links like `/plans` and `/settings` still load correctly on refresh.
- The PWA manifest and service worker are generated at build time with `vite-plugin-pwa`.
- The service worker caches the app shell and built assets for offline use, but user data still lives in browser storage on that device.
- Data is device- and browser-profile-local unless the user manually exports and imports a backup.
- Supported mobile browsers can install the app in standalone mode.
- The app assumes a browser environment with JavaScript, `localStorage`, file download/upload support for backup files, and service worker support for the PWA experience.
- Some non-critical visual assets are fetched from third parties at runtime, including Google Fonts and the Unsplash image used on the plan creation screen.

## Local Development

Prerequisite: Node.js

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Run the TypeScript check with `npm run lint`.
4. Build the production bundle with `npm run build`.
5. Preview the production build with `npm run preview`.

## Android Tester Packaging

The repo now includes a Capacitor Android wrapper so Megalifts can be shipped to testers as a downloadable Android app without requiring a continuously hosted web server.

Current Android packaging flow:

1. Run `npm run lint`
2. Run `npm test`
3. Run `npm run build:android:web`
4. Run `npm run sync:android`

Useful Android commands:

- `npm run open:android`
- `npm run run:android`

Important:

- Android tester builds use the web assets bundled into the native project from `dist`.
- Web changes do not automatically reach installed Android builds; after app changes you must rebuild, sync, and create a new Android release.
- See [docs/android-testing.md](C:/Users/carve/OneDrive/Projects/workout/docs/android-testing.md) for the repo-specific Android workflow.
- See [docs/android-tester-release.md](C:/Users/carve/OneDrive/Projects/workout/docs/android-tester-release.md) for signed AAB creation and Google Play internal-testing distribution.
