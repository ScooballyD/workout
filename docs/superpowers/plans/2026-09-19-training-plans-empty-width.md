# Training Plans Empty-State Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the empty Training Plans screen fill the usable phone width while preserving the populated screen's current width and spacing.

**Architecture:** This is a layout-only change to the shared `TrainingPlans` root container. Adding `w-full` makes the existing capped and centered container claim the available width for both branches; no conditional layout, state, or new component is required.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, Capacitor Android.

---

### Task 1: Make The Shared Plans Container Full Width

**Files:**
- Modify: `src/App.tsx:720-725`
- Modify: `todo.md`

- [x] **Step 1: Inspect the current root class and establish the visual baseline**

Confirm that `TrainingPlans` currently uses the shared root container below, and use the connected Android device to capture the no-plan screen before changing it:

```tsx
className="flex-1 px-6 pt-24 pb-32 max-w-2xl mx-auto"
```

Expected baseline: the no-plan sections look horizontally compressed while the populated plans view is comfortable.

- [x] **Step 2: Apply the minimal full-width utility**

Change only the root container class to:

```tsx
className="flex-1 w-full px-6 pt-24 pb-32 max-w-2xl mx-auto"
```

Do not change the existing padding, `max-w-2xl`, centering, conditional branches, card markup, or plan-state logic.

- [x] **Step 3: Run static and production checks**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit successfully without TypeScript or Vite errors.

- [x] **Step 4: Verify both mobile layout states on Android**

Build and sync the web assets, install the debug APK, then compare the Plans screen at the same device viewport:

```powershell
npm run sync:android
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
.\android\gradlew.bat assembleDebug
```

Expected: with no plans, the title, `CURRENT PROGRAM` empty card, and `CREATE NEW PLAN` button use the same available width as the populated view. With a plan present, the existing capped width, margins, cards, and schedule remain visually unchanged.

- [x] **Step 5: Update task tracking and prepare the focused change for integration**

Remove task 1 from `todo.md` and append this completed-task summary:

```md
6. [P2] The empty Training Plans screen now explicitly fills the available mobile width while preserving the populated layout's existing cap, margins, and spacing.
```

Stage only the implementation, plan, spec, and task-tracking files, then commit:

```powershell
git add src/App.tsx todo.md docs/superpowers/specs/2026-09-19-training-plans-empty-width-design.md docs/superpowers/plans/2026-09-19-training-plans-empty-width.md
git commit -m "Fix empty training plans width"
```

## Outcome

- `src/App.tsx` now uses `w-full` on the shared Training Plans root container.
- `npm run lint`, `npm run build`, `npm run sync:android`, and `./gradlew.bat assembleDebug` passed.
- The connected Android device verified both populated and empty Plans states at the same viewport. The empty current-program card and create button now use the same horizontal margins and available width as the populated cards.
