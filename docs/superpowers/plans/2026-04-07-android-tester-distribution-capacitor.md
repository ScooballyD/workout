# Android Tester Distribution With Capacitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Megalifts as a downloadable Android app for testers without depending on a continuously hosted web server, by bundling the web app into a native Android shell using Capacitor.

**Architecture:** Keep the current Vite/React PWA as the product codebase, but add a Capacitor Android wrapper that copies the built web assets into the native Android project. Tester installs then run from bundled assets inside the app package instead of loading the UI from a hosted TWA URL.

**Tech Stack:** Vite PWA, React 19, Capacitor, Android Studio, Android signing, Google Play internal testing

---

### Task 1: Freeze the current web release candidate and verify build health

**Files:**
- Review: `package.json`
- Review: `vite.config.ts`
- Review: `src/main.tsx`
- Review: generated `dist/`

- [ ] **Step 1: Verify the current app is releasable before native packaging**

Run: `npm run lint`
Expected: PASS

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS and `dist/` generated

- [ ] **Step 2: Confirm the app works correctly as a built web bundle**

Run: `npm run preview`

Manual checks:
- launch app
- plan creation/selection
- set logging
- PR Vault
- Settings export/import
- app relaunch and persistence

Acceptance:
- no web build blocker is carried into the native packaging step

### Task 2: Add Capacitor to the project

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts` or `capacitor.config.json`
- Create: Android native project files under `android/`

- [ ] **Step 1: Install Capacitor packages**

Run:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android
```

Expected:
- Capacitor packages added to `package.json`

- [ ] **Step 2: Initialize Capacitor**

Run:

```bash
npx cap init
```

Provide:
- app name: `Megalifts`
- app id: your chosen reverse-domain package id, for example `com.yourteam.megalifts`
- web asset directory: `dist`

Acceptance:
- Capacitor config created

- [ ] **Step 3: Add the Android platform**

Run:

```bash
npx cap add android
```

Expected:
- `android/` project generated

### Task 3: Align the web build and Capacitor asset flow

**Files:**
- Modify: `package.json`
- Review: `vite.config.ts`
- Review: `capacitor.config.*`

- [ ] **Step 1: Add packaging scripts**

Add scripts such as:

```json
{
  "build:android:web": "npm run build",
  "sync:android": "npx cap sync android",
  "open:android": "npx cap open android",
  "run:android": "npx cap run android"
}
```

- [ ] **Step 2: Verify Capacitor copies built assets into Android**

Run:

```bash
npx cap sync android
```

Expected:
- web assets copied into the Android project
- native dependencies installed

Reference:
- Capacitor docs describe `npx cap sync` as syncing web assets and installing native dependencies.

- [ ] **Step 3: Verify there are no base-path assumptions that break packaged assets**

Acceptance checks:
- built assets load correctly from the native app
- router behavior does not depend on external server rewrites
- service worker assumptions do not break the Android shell

Note:
- This repo currently uses `BrowserRouter`; test that the native shell navigation behaves correctly with the built app.

### Task 4: Decide how the native Android wrapper should behave

**Files:**
- Modify: `capacitor.config.*`
- Optionally create: Android app icons/splash assets

- [ ] **Step 1: Lock native app identity**

Choose and record:
- package id
- app name
- launcher icon
- versioning strategy

- [ ] **Step 2: Decide whether any native plugins are required**

For first tester builds, prefer no extra plugins unless necessary.

Likely current answer for this repo:
- no auth plugin
- no API client plugin
- possibly no extra plugin at all

- [ ] **Step 3: Confirm local-first behavior remains intact**

Acceptance checks:
- all current app state remains device-local
- no hosted server is required to open the app
- testers can use the app offline after install, within the limits of current local-storage behavior

### Task 5: Build and run the Android app locally

**Files:**
- Modify: Android project files under `android/` as needed

- [ ] **Step 1: Open the Android project**

Run:

```bash
npx cap open android
```

Expected:
- Android Studio opens the generated project

- [ ] **Step 2: Run on emulator or connected Android device**

Run one of:

```bash
npx cap run android
```

or use Android Studio Run.

Acceptance checks:
- app launches successfully
- initial screen renders
- navigation works
- no blank-screen or asset-load failures

- [ ] **Step 3: Validate tester-critical flows on Android**

Manual checks:
- create/select plan
- log sets
- open PR Vault
- use Settings export/import
- close and relaunch app
- confirm data persists

### Task 6: Handle Android-specific UX and runtime issues before tester release

**Files:**
- Modify as needed: `src/main.tsx`, `src/App.tsx`, Android project config files

- [ ] **Step 1: Validate storage behavior inside the Android WebView**

Acceptance checks:
- `localStorage` persists across relaunch
- wipe/reset behaves correctly
- backup export/import remains usable

- [ ] **Step 2: Validate routing behavior inside Capacitor**

Acceptance checks:
- internal navigation works
- deep route reloads do not fail inside the app shell
- back-button behavior is acceptable on Android

- [ ] **Step 3: Validate mobile UX specifics**

Checks:
- keyboard interactions
- scroll behavior
- viewport sizing
- status bar overlap or safe-area issues

### Task 7: Prepare the Android release build

**Files:**
- Create: signing keystore in secure internal storage
- Modify: Android signing config in the Android project

- [ ] **Step 1: Create the Android signing key**

Deliverables:
- release keystore generated once
- passwords stored in a team secret manager
- ownership documented internally

- [ ] **Step 2: Configure release signing**

In Android Studio / Gradle:
- set release keystore path
- set key alias
- set signing passwords securely

- [ ] **Step 3: Build the signed release artifact**

Create one of:
- APK for direct tester installation
- AAB for Google Play internal testing

Acceptance:
- signed artifact generated successfully

### Task 8: Choose the first tester distribution path

**Files:**
- Create: tester install instructions

- [ ] **Step 1: Preferred path: Google Play internal testing**

Use Play internal testing for safer distribution and easier updates.

Google Play internal testing supports up to 100 testers and is recommended for early QA.

- [ ] **Step 2: Temporary fallback: direct APK side-loading**

Use only if Play Console setup is blocking immediate installs.

Document:
- how to enable install from unknown sources
- how to uninstall/reinstall safely
- how to export backup before reinstalling

### Task 9: Ship through Google Play internal testing

**Files:**
- Create or update: Play listing assets and copy
- Create: tester email list

- [ ] **Step 1: Create the Play Console app**

Prepare:
- package id matching the Android build
- app name
- screenshots
- icon
- privacy/data-safety disclosures as required

- [ ] **Step 2: Upload the App Bundle to internal testing**

Acceptance:
- release created successfully
- internal test track enabled
- tester access link generated

- [ ] **Step 3: Add testers and distribute instructions**

Include:
- install link
- supported devices: Android
- what to test first
- how to export backup before reporting major issues
- where to send feedback

### Task 10: Define the update workflow for tester builds

**Files:**
- Create: release workflow doc
- Update: `README.md` or `docs/android-testing.md`

- [ ] **Step 1: Define how future updates ship**

With Capacitor, web asset changes are not automatically live in installed builds. The update flow is:
- change web code
- `npm run build`
- `npx cap sync android`
- rebuild the Android release
- redistribute through Play or side-load

Capture that explicitly so the team does not assume TWA-style instant server updates.

- [ ] **Step 2: Define tester release cadence**

Decide:
- ad hoc builds vs weekly drops
- who approves tester releases
- what blocks a new mobile build

- [ ] **Step 3: Define rollback/recovery**

Recovery plan:
- keep the last signed stable build
- if a bad build ships, roll testers back to the prior Play/internal release
- instruct testers to export data before reinstall if needed

### Task 11: Document the Capacitor delivery path in-repo

**Files:**
- Create or update: `README.md`
- Create or update: `agent_docs/pwa-build.md`
- Optionally create: `docs/android-testing.md`

- [ ] **Step 1: Document the architecture choice**

Record:
- app is packaged with Capacitor for Android tester builds
- web assets are bundled into the native app
- no continuously hosted server is required for app startup/runtime

- [ ] **Step 2: Document the critical maintenance rules**

Capture:
- after web changes, always rebuild and `cap sync`
- Android package id/signing identity must stay stable
- localStorage behavior must be rechecked on Android after risky persistence changes
- BrowserRouter/native navigation interactions need smoke testing after routing changes

### Task 12: Final tester-launch checklist

**Files:**
- Update: release checklist doc

- [ ] **Step 1: Confirm all pre-release gates**

Required:
- `npm run lint`
- `npm test`
- `npm run build`
- `npx cap sync android`
- local Android smoke test passed
- signed release artifact created
- tester distribution path ready

- [ ] **Step 2: Start with a small first wave**

Recommended:
- 5 to 10 trusted Android testers first
- gather install friction and device-specific feedback
- expand only after initial stability is acceptable

### Sources

- Capacitor docs: [capacitorjs.com/docs](https://capacitorjs.com/docs)
- Capacitor CLI workflow (`sync`, `copy`, `open`, `run`): sourced via official Capacitor docs queried through Context7
- Google Play internal testing: [support.google.com/googleplay/android-developer/answer/9845334](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
