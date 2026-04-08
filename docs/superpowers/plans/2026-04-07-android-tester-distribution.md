# Android Tester Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Megalifts to Android-heavy testers as an installable Android app with minimal product risk by packaging the existing hosted PWA as a Trusted Web Activity and distributing it through Google Play internal testing.

**Architecture:** Keep the current app as the source of truth: a static Vite/React PWA hosted on HTTPS. Wrap that hosted app in an Android shell using Bubblewrap/Trusted Web Activity, then distribute the generated Android build through Play Console internal testing instead of building a separate native codebase.

**Tech Stack:** Vite PWA, static hosting, Chrome Trusted Web Activity, Bubblewrap CLI, Android signing, Google Play Console internal testing

---

### Task 1: Freeze the release candidate and verify PWA install readiness

**Files:**
- Review: `package.json`
- Review: `vite.config.ts`
- Review: `src/main.tsx`
- Review: `dist/manifest.webmanifest` after build

- [ ] **Step 1: Build the current release candidate**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `dist/` generated

- [ ] **Step 2: Inspect the generated PWA assets**

Check:
- `dist/manifest.webmanifest` exists
- icon paths resolve under the intended base path
- service worker files are present in `dist/`

Run: `Get-Content dist\\manifest.webmanifest`
Expected: valid manifest JSON with app name, icons, `start_url`, and `scope`

- [ ] **Step 3: Manually verify the hosted-web assumptions**

Acceptance checks:
- the app is installable as a PWA in mobile Chrome
- routing works after reload on non-root routes
- offline/app-shell behavior is acceptable for testing
- no server-only assumptions exist at runtime

- [ ] **Step 4: Record any release blockers**

Capture before packaging:
- missing icons or splash assets
- manifest/scope issues
- broken route refreshes
- localStorage/backup behavior that would hurt testers

### Task 2: Set up stable HTTPS hosting for the tester build

**Files:**
- Create or update: hosting config for the chosen platform
- Review: deployment docs if already present

- [ ] **Step 1: Choose the hosting target**

Use a host that supports:
- HTTPS
- SPA route rewrites to `index.html`
- stable production-like URL
- easy redeploys for future tester updates

Recommended options:
- Cloudflare Pages
- Netlify
- Firebase Hosting
- Vercel with SPA rewrite configuration

- [ ] **Step 2: Deploy the built app to a stable tester URL**

Acceptance checks:
- URL is public and HTTPS
- tester build is not behind local auth that would break TWA
- route reloads succeed
- manifest and service worker load from the same origin

- [ ] **Step 3: Verify the hosted app on an actual Android phone**

Manual checks:
- open the hosted URL in Chrome on Android
- confirm install prompt or “Add to Home screen” works
- launch the installed PWA
- confirm data persists across app relaunch

### Task 3: Prepare Android packaging prerequisites for TWA

**Files:**
- Create: Android packaging workspace outside the main web app if desired
- Create: signing/keystore documentation in a secure internal location

- [ ] **Step 1: Install Bubblewrap and required tooling**

Official Chrome guidance says Bubblewrap can initialize and build a TWA project from the web manifest, and can install the generated APK locally for testing.

Run: `npm install -g @bubblewrap/cli`
Expected: Bubblewrap available on PATH

Note:
- Chrome’s quick start states Bubblewrap can offer to install required external dependencies such as JDK/Android command-line tooling on first run.

- [ ] **Step 2: Decide app identity values before generation**

Lock down:
- Android application ID / package name
- app name shown to testers
- launcher icon set
- signing key ownership
- production host URL

- [ ] **Step 3: Create and securely store the Android signing key**

Deliverables:
- release keystore generated once
- passwords stored in your team secret manager
- recovery/ownership documented internally

Do not:
- commit keystore files
- commit raw passwords

### Task 4: Generate the Trusted Web Activity project

**Files:**
- Create: TWA project directory (for example `android-twa/` or a sibling repo)
- Generate: Android project files from Bubblewrap

- [ ] **Step 1: Initialize the TWA project from the hosted manifest**

Chrome’s quick start documents:

Run: `bubblewrap init --manifest=https://<your-host>/manifest.webmanifest`

Expected:
- Bubblewrap reads the manifest
- prompts for Android app values
- generates the Android wrapper project

- [ ] **Step 2: Configure Digital Asset Links**

TWA requires the app and site to prove they come from the same developer using Digital Asset Links.

Deliverables:
- generated SHA-256 certificate fingerprint from the Android signing key
- `/.well-known/assetlinks.json` hosted on the app domain

Acceptance checks:
- `https://<your-host>/.well-known/assetlinks.json` is publicly reachable
- values match the Android package name and signing fingerprint exactly

- [ ] **Step 3: Build the Android package**

Chrome’s quick start documents:

Run: `bubblewrap build`

Expected:
- signed Android output generated
- APK or App Bundle available for testing/upload

- [ ] **Step 4: Install on a local Android device for smoke testing**

Chrome’s quick start documents:

Run: `bubblewrap install`

Alternative:
- `adb install app-release-signed.apk`

Acceptance checks:
- app launches fullscreen without browser chrome
- navigation and deep links behave normally
- app feels like the hosted PWA, not a broken wrapper

### Task 5: Run Android-specific tester QA before external distribution

**Files:**
- Create: simple tester checklist doc
- Optionally create: issue template for tester feedback

- [ ] **Step 1: Validate the main Android tester flows**

Manual checks on at least one real Android phone:
- first launch
- plan creation/selection
- set logging
- PR Vault rendering
- Settings export/import
- relaunch persistence
- offline or flaky-network reopen behavior

- [ ] **Step 2: Validate update behavior**

Checks:
- redeploy hosted web app
- reopen installed Android wrapper
- confirm new web build is picked up as expected

- [ ] **Step 3: Validate failure behavior**

Checks:
- unsupported/non-Chrome browser fallback expectations are documented
- broken asset-links scenario is understood internally
- testers know how to reinstall if the local app state becomes invalid

### Task 6: Distribute to testers through Google Play internal testing

**Files:**
- Create or update: Play Console app listing assets and copy
- Create: tester email list

- [ ] **Step 1: Create the Play Console app**

Prepare:
- app name
- package name
- screenshots
- icon
- privacy/data disclosures as needed

- [ ] **Step 2: Upload the Android build to internal testing**

Google Play’s internal testing track is recommended for initial QA and supports up to 100 testers.

Acceptance checks:
- release uploaded successfully
- internal test track created
- tester access link generated

- [ ] **Step 3: Add testers**

Google Play internal testing supports:
- direct email lists
- Google Groups

Deliverables:
- tester roster added
- invitation link shared
- install instructions written in plain language

- [ ] **Step 4: Send a tester packet**

Include:
- install link
- supported device expectation: Android + Chrome
- what to test first
- known limitations
- how to export backup before reporting serious bugs
- where to send feedback

### Task 7: Set up the release/feedback loop for follow-up tester drops

**Files:**
- Create: release checklist doc
- Create: tester feedback tracker

- [ ] **Step 1: Define release cadence**

Decide:
- ad hoc builds vs weekly drops
- who approves tester pushes
- what blocks a new tester release

- [ ] **Step 2: Define issue triage rules**

Classify feedback into:
- app bugs
- packaging/TWA bugs
- hosting/deployment bugs
- device-specific Android issues

- [ ] **Step 3: Define rollback/recovery**

Recovery plan:
- redeploy previous stable web build if the hosted PWA is broken
- pause or replace the internal testing release if the Android wrapper is broken
- instruct testers how to export or preserve data before reinstall

### Task 8: Optional fallback if Play Console is too slow for the first round

**Files:**
- Create only if needed: side-load instructions

- [ ] **Step 1: Keep APK side-loading as a temporary fallback**

Use only if:
- Play Console setup blocks immediate testing
- you need same-day installs for a very small trusted group

Risks to document:
- rougher install experience
- manual update burden
- more tester friction and trust issues

- [ ] **Step 2: Move back to Play internal testing quickly**

Acceptance:
- side-loading is treated as a bridge, not the long-term process

### Task 9: Document the shipping workflow in-repo

**Files:**
- Create or update: `README.md`
- Create or update: `agent_docs/pwa-build.md`
- Optionally create: `docs/android-testing.md`

- [ ] **Step 1: Document the chosen Android delivery strategy**

Record:
- hosted PWA URL
- TWA/Bubblewrap packaging flow
- signing ownership
- Play internal testing workflow

- [ ] **Step 2: Document the critical no-regression rules**

Capture:
- do not casually change manifest/base-path behavior
- route rewrites are required on the host
- `assetlinks.json` must stay in sync with package/signing identity
- hosting outages break the Android wrapper experience

### Task 10: Final launch checklist

**Files:**
- Update: release checklist doc

- [ ] **Step 1: Confirm all release gates**

Required:
- `npm run lint`
- `npm run build`
- hosted Android Chrome smoke test passed
- Bubblewrap build/install passed
- Play internal test release published

- [ ] **Step 2: Confirm tester-facing readiness**

Required:
- install instructions written
- feedback channel active
- rollback owner assigned
- known limitations documented

- [ ] **Step 3: Start with a small first wave**

Recommended:
- 5 to 10 trusted Android testers first
- expand after first feedback batch is clean

### Sources

- Chrome for Developers, Trusted Web Activity overview: [developer.chrome.com/docs/android/trusted-web-activity](https://developer.chrome.com/docs/android/trusted-web-activity)
- Chrome for Developers, Bubblewrap quick start: [developer.chrome.com/docs/android/trusted-web-activity/quick-start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- Google Play Console Help, internal testing: [support.google.com/googleplay/android-developer/answer/9845334](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
