# Execution Plans

This file defines how agents should write and maintain large-task execution plans in this repository.

Use a plan when the work is large enough that a short prompt is likely to miss important context, such as:

- multi-file features
- significant refactors
- risky state or persistence changes
- PWA, storage, routing, or data-model work
- tasks expected to take multiple iterations or handoffs

Treat every plan as a living document. A plan must be good enough that a new agent with only the current working tree and the plan file can continue the work safely.

## Core Rules

- A plan must be self-contained. Do not assume prior chat context.
- A plan must explain the user-visible outcome first, not just code changes.
- A plan must name the exact files, modules, and commands involved.
- A plan must define acceptance in observable terms.
- A plan must stay up to date as work progresses.
- A plan must record important decisions and discoveries.
- A plan must include verification steps appropriate for this repo.

## Repo Expectations

This project is a static Vite + React + TypeScript PWA intended to work well on phones.

Plans for this repo should account for:

- mobile-first UX
- low client-side overhead
- static-host compatibility
- local-storage and backup compatibility when changing persisted data
- PWA install/offline behavior when changing routing, assets, or service worker logic

Unless the task explicitly says otherwise, verification should include:

- `npm run lint`
- `npm run build`

If the task affects installability, offline behavior, routing, or persisted state, also include:

- `npm run preview`
- a short manual validation flow

## When Writing a Plan

Write the plan in plain language for a newcomer to this repo. Define non-obvious terms immediately. Do not point the reader to an external article or prior chat for essential context. Embed the needed context directly in the plan.

Prefer prose over giant checklists, but keep the progress section structured so someone can resume work easily.

If there are unknowns, include a small research or prototype milestone before full implementation.

If the task is risky, include rollback or recovery guidance.

## Required Sections

Every plan should contain these sections:

### Title

A short, action-oriented name.

### Purpose / User Outcome

Explain what the user will be able to do after the work is complete and how they can tell it works.

### Context and Orientation

Describe the relevant current system as if the reader has never seen this repo. Name the important files and explain how they fit together.

### Progress

Use checkboxes with timestamps. This section must reflect the actual current state.

Example:

- [x] 2026-04-02 15:00 America/Chicago: Reviewed current PR Vault filter implementation.
- [ ] Update PR Vault filters to be data-driven.
- [ ] Verify filter behavior in build and preview flows.

### Decision Log

Record important choices.

Example:

- Decision: Keep filter state in the page component instead of moving it into shared app state.
  Rationale: The behavior is local to PR Vault and does not need persistence.
  Date/Author: 2026-04-02 / Codex

### Surprises & Discoveries

Capture unexpected behaviors, bugs, tradeoffs, or evidence found during implementation.

### Plan of Work

Describe the intended edits in concrete prose. Name the files and functions to change and what should happen there.

### Validation and Acceptance

List the exact commands to run, where to run them, and what success looks like.

For this repo, prefer acceptance statements like:

- Running `npm run lint` succeeds with no TypeScript errors.
- Running `npm run build` produces a working production bundle.
- In preview, changing setting X results in visible behavior Y.

### Idempotence and Recovery

Explain how to re-run steps safely, and what to do if a step partially fails.

### Outcomes & Retrospective

Summarize what was completed, what remains, and any follow-up work.

## Plan Quality Bar

A good plan in this repo should answer all of these:

- What is changing for the user?
- Which files matter?
- What sequence should the agent follow?
- How will persisted data remain safe?
- How will mobile/PWA behavior be validated if relevant?
- What exact commands prove the work is done?

If any of those are missing, the plan is incomplete.

## Suggested Template

Use this template when creating a new plan file.

```md
# <Short action-oriented title>

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Explain what the user gains after this change and how to observe it.

## Context and Orientation

Describe the current repo areas involved. Name the important files and explain how they connect.

## Progress

- [ ] Initial investigation
- [ ] Implementation
- [ ] Verification

## Decision Log

- Decision: ...
  Rationale: ...
  Date/Author: ...

## Surprises & Discoveries

- Observation: ...
  Evidence: ...

## Plan of Work

Describe the intended edits in concrete prose. Name the files and functions/modules to update.

## Validation and Acceptance

- Run `npm run lint`
- Run `npm run build`
- If relevant, run `npm run preview`
- Describe the manual behavior to confirm

## Idempotence and Recovery

Explain safe retry steps, cleanup, or rollback guidance.

## Outcomes & Retrospective

Summarize what shipped, what remains, and any follow-up tasks.
```

## Notes for Agents

- Keep plans concise, but not vague.
- Do not turn a plan into a changelog before work starts.
- Do not leave a stale plan behind after major decisions change.
- If the task becomes much smaller than expected, the plan can stay short, but it must still include the required sections.

---

# Add explicit optional deload weeks to training plans

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Users creating a new training plan can optionally turn on a final deload week. When enabled, the saved plan lasts one extra week beyond the chosen duration and that extra final week is treated as part of the normal plan lifecycle, not a temporary runtime override. During the deload week, workout exercises should default to 25% less weight than their normal working value and 25% fewer sets using the user-specified rule of record for set rounding (`3 -> 3`, `5 -> 4`). Existing saved plans and imported backups that do not include any deload data must still load and run without errors.

## Context and Orientation

[`src/types.ts`](C:\Users\carve\OneDrive\Projects\workout\src\types.ts) defines the persisted `TrainingPlan` shape, so it is the source of truth for whether deload is part of the plan model. [`src/lib/backup.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\backup.ts) normalizes plans from localStorage and imported backups, making it the compatibility boundary for older plan records that do not yet include deload metadata. [`src/App.tsx`](C:\Users\carve\OneDrive\Projects\workout\src\App.tsx) owns the create-plan form, the saved plan list, active-plan workout rendering, and the exercise log screen, so it currently threads `currentWeek`, `durationWeeks`, and plan state into the workout experience. [`src/lib/plan-progress.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\plan-progress.ts), [`src/lib/next-set-info.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\next-set-info.ts), and [`src/lib/exercise-log-inputs.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\exercise-log-inputs.ts) determine how weeks advance and which default working values appear during execution, so deload behavior needs to be explicit there instead of hidden in JSX conditionals.

## Progress

- [x] 2026-04-03 09:26 America/Chicago: Reviewed current plan model, create-plan flow, progress helpers, workout default helpers, and backup normalization to locate the deload lifecycle boundary.
- [x] 2026-04-03 09:39 America/Chicago: Added failing tests for deload plan normalization, deload-week detection, reduced set-count rounding, and reduced default-weight behavior, then verified the expected red state before implementation.
- [x] 2026-04-03 09:56 America/Chicago: Implemented persisted deload metadata, explicit deload helpers, create-plan UI toggles and summaries, and active workout rendering/logging changes for the final deload week.
- [x] 2026-04-03 10:17 America/Chicago: Ran `npm run lint`, `npm run build`, and manual preview validation for normal-plan creation, deload-plan creation, final-week deload execution, and legacy stored plan loading.

## Decision Log

- Decision: Store deload as explicit persisted plan metadata instead of deriving it from plan length or runtime UI state.
  Rationale: The user asked for the extra week to be part of the plan lifecycle. Persisting a `deload` setting on the plan keeps creation, display, execution, export/import, and legacy compatibility predictable.
  Date/Author: 2026-04-03 / Codex
- Decision: Preserve decimal weight values during deload instead of rounding to the nearest whole number.
  Rationale: The app already stores and displays decimal weights for unit conversion. Applying the 25% reduction without whole-number rounding keeps deload defaults consistent with the existing weight model and avoids surprising jumps for kg users.
  Date/Author: 2026-04-03 / Codex

## Surprises & Discoveries

- Observation: `durationWeeks` is currently treated as total lifecycle length everywhere in the app, including progress bars and completion checks.
  Evidence: `getPlanProgressSnapshot`, `isPlanComplete`, and the plan summary UI in `src/App.tsx`.
- Observation: Default workout values are computed in helper modules before rendering, which makes them a good fit for explicit deload logic.
  Evidence: `getNextSetInfo` and `createExerciseLogInputValues` currently own default weight and rep calculations.
- Observation: The active workout list and log UI both assume `exercise.sets` is the rendered set count, so deload set reduction will likely need an execution-specific display layer rather than mutating stored exercise definitions.
  Evidence: `DailyGrind` and `ExerciseLog` render arrays based on `exercise.sets`.
- Observation: The requested set-rounding examples only match `ceil(originalSets * 0.75)`, not “round the reduction amount.”
  Evidence: The explicit user examples `3 -> 3` and `5 -> 4`.

## Plan of Work

First, add regression coverage for the new persisted plan contract and runtime behavior. The tests should prove that legacy plans without deload metadata still normalize successfully, that a plan with deload enabled has one extra lifecycle week, and that final-week workout defaults apply the exact deload rules without changing normal-week behavior. Then extend the `TrainingPlan` type and backup normalization to include explicit deload metadata with safe defaults for older stored data. After that, update the create-plan form in `src/App.tsx` with a mobile-friendly optional deload toggle and save logic that adds one extra week when enabled while keeping the user-facing selected duration understandable. Finally, thread the plan’s deload state into workout execution so the final week reduces default weight by 25% without whole-number rounding and reduces displayed/loggable set count by the established rounding rule while leaving the underlying exercise records and non-deload plans unchanged.

## Validation and Acceptance

- Run focused tests that cover legacy plan normalization, deload progress, and deload workout default calculations. Confirm the new tests fail before implementation and pass after the changes.
- Run `npm run lint` and confirm there are no TypeScript errors.
- Run `npm run build` and confirm the production bundle succeeds.
- Manually confirm:
  - creating a normal plan behaves exactly as before
  - creating a plan with deload enabled adds one extra week beyond the selected duration
  - the final week uses reduced weight and reduced sets per the documented rules
  - existing localStorage plans and older backups still load without migration errors

## Idempotence and Recovery

These changes are safe to retry as long as the type definition, backup normalization, and runtime logic are kept in sync. Legacy plans should continue to parse because the new deload metadata will be optional on read and defaulted when absent. If the deload lifecycle regresses progress or execution behavior, revert the type, backup, helper, and `App.tsx` edits together so the persisted contract and the UI/runtime semantics do not diverge.

## Outcomes & Retrospective

Implemented optional final deload weeks as persisted plan metadata without breaking older plan records. New plans can now opt into a final deload week at creation time, saved deload plans store both total duration and base selected duration explicitly, and the final week now renders as part of the normal plan lifecycle in the plans screen and daily workout flow.

Verification completed for the requested scope. Focused regression tests passed after a confirmed red-to-green cycle, `npm run lint` and `npm run build` both succeeded, preview validation showed that a normal plan still saved as `WEEK 1 OF 4` with no deload copy, a deload plan saved as `WEEK 1 OF 5` with a base-plus-deload note, the final deload week rendered 4 working sets for a 5-set exercise and defaulted 185 to 138.75, and a legacy stored plan without deload metadata loaded cleanly with no migration error behavior.

---

# Persist exercise muscle-group tags

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Users can assign a primary muscle-group tag to an exercise while building a training plan, and that tag is stored as part of the real exercise data model so it survives reloads and backup export/import. Existing stored plans, exercises, and older backups that do not include tags must still load without errors and continue working with sensible defaults.

## Context and Orientation

[`src/types.ts`](C:\Users\carve\OneDrive\Projects\workout\src\types.ts) defines the persisted `Exercise` shape used across the app. [`src/constants.ts`](C:\Users\carve\OneDrive\Projects\workout\src\constants.ts) provides the built-in starter exercise list that should now include primary muscle tags. [`src/lib/backup.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\backup.ts) normalizes exercises, plans, and backups from localStorage and imported files, so it is the compatibility gate for older data with omitted fields. [`src/lib/plan-editor.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\plan-editor.ts) currently treats plan-day exercises as names only; it will need to accept a tag during add-flow composition without breaking the existing stored schedule format. [`src/App.tsx`](C:\Users\carve\OneDrive\Projects\workout\src\App.tsx) owns the create-plan UI, saves newly created exercises into app state, and handles export/import/wipe behavior.

## Progress

- [x] 2026-04-02 22:05 America/Chicago: Reviewed types, constants, backup normalization, plan-editor helpers, existing tests, and the current create-plan flow.
- [x] 2026-04-02 22:11 America/Chicago: Added failing tests for legacy exercise-tag normalization and plan-editor draft building, then verified they failed before implementation.
- [x] 2026-04-02 22:22 America/Chicago: Implemented the primary-muscle model, built-in tag constants/defaults, seed data updates, and inline tag selection in the create-plan flow.
- [x] 2026-04-02 22:53 America/Chicago: Verified `npm run lint`, `npm run build`, and preview-browser flows for legacy localStorage load, tagged exercise creation, reload persistence, export/import persistence, and default-tag fallback.

## Decision Log

- Decision: Store the tag on `Exercise` as a single primary muscle-group field instead of changing the plan schedule schema.
  Rationale: Exercise records are already the persisted source of truth in localStorage, backups, and workout/PR flows. Keeping tags there avoids a wider migration of plan schedules while still giving the app durable exercise metadata for later filtering and analytics.
  Date/Author: 2026-04-02 / Codex

## Surprises & Discoveries

- Observation: The current plan schedule stores exercise names only, and `handleSavePlan` creates missing `Exercise` records after the plan is saved.
  Evidence: `handleSavePlan` in `src/App.tsx`.
- Observation: `backup.ts` already treats several fields as optional and normalizes legacy payloads rather than rejecting them outright.
  Evidence: `normalizeExercise`, `validateImportedBackup`, and `backup.test.ts`.
- Observation: Seeding preview state with Playwright `addInitScript` can invalidate reload persistence checks because the seed is replayed on every navigation.
  Evidence: The first preview script version reset localStorage on reload until the setup switched to same-origin `page.evaluate(...)`.

## Plan of Work

First, extend the backup and plan-editor tests so they pin down the intended compatibility rules: exercises without a tag should normalize to a default category, imported legacy backups should still validate, and adding an exercise during plan creation should capture both a normalized name and an explicit or default tag. Then update the shared type definitions and seed constants to include a primary muscle-group field plus a small central list of allowed categories. After the data model is in place, update the create-plan flow in `src/App.tsx` to let the user choose a tag inline when adding a workout exercise, keep the interaction single-screen and mobile-friendly, and persist the chosen tag when `handleSavePlan` creates any new `Exercise` records. Finally, verify local storage parsing, export/import, and plan creation behavior end-to-end.

## Validation and Acceptance

- Run `npm test -- src/lib/backup.test.ts src/lib/plan-editor.test.ts` and confirm the new tests fail before implementation, then pass after the changes.
- Run `npm run lint` and confirm there are no TypeScript errors.
- Run `npm run build` and confirm the production bundle succeeds.
- Run `npm run preview` and manually confirm:
  - existing stored data still loads
  - a new exercise can be added with a tag
  - the chosen tag persists after reload, export, and import
  - plans created without an explicit tag still work because a default tag is applied

## Idempotence and Recovery

The normalization and UI changes are safe to rerun because older stored data continues to parse through the same normalization layer. If the new tag field causes a regression, revert only the type, constant, backup, plan-editor, and `App.tsx` changes together so the persisted data contract stays consistent, then rerun lint/build before retrying.

## Outcomes & Retrospective

Implemented exercise primary-muscle tags as persisted `Exercise` metadata without changing the stored plan schedule format. The create-plan flow now lets users choose a tag inline when adding a workout exercise, existing exercises reuse their saved tag automatically, and any new exercise added without an explicit selection falls back to `Other`.

Compatibility and verification are complete for the requested scope. Legacy stored exercises and imported backups without tags normalize successfully, `npm run lint` and `npm run build` both passed, and preview-browser validation confirmed legacy data load, tagged exercise creation, reload persistence, export/import persistence, and default-tag fallback behavior.

---

# Harden npm audit transitive dependency chain

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Remove the current `npm audit` finding caused by `vite-plugin-pwa -> workbox-build -> @rollup/plugin-terser -> serialize-javascript` without downgrading `vite-plugin-pwa` or using `npm audit fix --force`. The app must continue to build the same standalone/offline PWA flow on Vite 6, and the dependency remediation must be explicit and reviewable in repo state.

## Context and Orientation

This repo is a static Vite + React + TypeScript PWA. [`package.json`](c:\Users\carve\OneDrive\Projects\workout\package.json) defines the dependency graph and install behavior, while [`package-lock.json`](c:\Users\carve\OneDrive\Projects\workout\package-lock.json) captures the exact resolved versions that `npm audit` evaluates. [`vite.config.ts`](c:\Users\carve\OneDrive\Projects\workout\vite.config.ts) uses `VitePWA` with the default `generateSW` strategy, `registerType: 'autoUpdate'`, a standalone manifest, and Workbox precache settings, so the safest remediation is one that preserves the existing plugin and Workbox APIs.

## Progress

- [x] 2026-04-02 20:11 America/Chicago: Reviewed `vite.config.ts`, `package.json`, installed package metadata, and current vulnerable dependency path.
- [x] 2026-04-02 20:15 America/Chicago: Added `src/lib/dependency-hardening.test.ts` and verified it failed before the dependency change.
- [x] 2026-04-02 20:16 America/Chicago: Added a `workbox-build`-scoped npm override in `package.json` and refreshed `package-lock.json` with `npm install`.
- [x] 2026-04-02 20:24 America/Chicago: Verified `npm audit`, `npm run lint`, and `npm run build`; started `npm run preview` successfully outside the sandbox after an in-sandbox `spawn EPERM` failure.

## Decision Log

- Decision: Prefer a parent-scoped override for `@rollup/plugin-terser` under `workbox-build` instead of forcing `serialize-javascript` alone.
  Rationale: `serialize-javascript@7.0.5` would bypass the vulnerable leaf but also crosses the declared major range of `@rollup/plugin-terser@0.4.4`. Upgrading the immediate parent to the already-patched plugin line is more likely to preserve runtime compatibility while still leaving the repo on `vite-plugin-pwa@1.2.0` and Workbox 7.
  Date/Author: 2026-04-02 / Codex

## Surprises & Discoveries

- Observation: `vite-plugin-pwa@1.2.0` lists peer support for `vite` `^3 || ^4 || ^5 || ^6 || ^7`, so the existing plugin version is intended to work with the repo’s `vite@6`.
  Evidence: Installed `node_modules/vite-plugin-pwa/package.json`.
- Observation: The current installed chain is exactly `vite-plugin-pwa@1.2.0 -> workbox-build@7.4.0 -> @rollup/plugin-terser@0.4.4 -> serialize-javascript@6.0.2`.
  Evidence: `npm ls vite-plugin-pwa workbox-build @rollup/plugin-terser serialize-javascript`.
- Observation: After the override and lockfile refresh, the resolved chain is `vite-plugin-pwa@1.2.0 -> workbox-build@7.4.0 -> @rollup/plugin-terser@1.0.0 -> serialize-javascript@7.0.5`.
  Evidence: `npm ls vite-plugin-pwa workbox-build @rollup/plugin-terser serialize-javascript`.
- Observation: `npm run preview` failed inside the sandbox with `Error: spawn EPERM` while loading `vite.config.ts`, but the same command started successfully when run outside the sandbox.
  Evidence: preview stderr from the sandboxed run and preview stdout from the escalated run.

## Plan of Work

Add a focused regression test under [`src/lib`](c:\Users\carve\OneDrive\Projects\workout\src\lib) that inspects the root `package.json` and `package-lock.json` to confirm the repo declares and resolves the dependency hardening for the vulnerable chain. Then update [`package.json`](c:\Users\carve\OneDrive\Projects\workout\package.json) with an npm `overrides` entry scoped to `workbox-build`, run `npm install` to refresh [`package-lock.json`](c:\Users\carve\OneDrive\Projects\workout\package-lock.json), and re-check the resolved dependency tree. After the dependency graph is fixed, run the repo verification commands and confirm the build/preview behavior still aligns with the current PWA setup in [`vite.config.ts`](c:\Users\carve\OneDrive\Projects\workout\vite.config.ts).

## Validation and Acceptance

- Run `npm test -- src/lib/dependency-hardening.test.ts` and confirm the new regression test fails before the fix, then passes after the fix.
- Run `npm install` and confirm the lockfile resolves the intended override.
- Run `npm audit` and confirm whether the advisory is removed or, if not, capture the exact remaining advisory output.
- Run `npm run lint` and confirm there are no TypeScript errors.
- Run `npm run build` and confirm the production bundle succeeds with `VitePWA`.
- Run `npm run preview` and confirm the preview server starts successfully for manual PWA smoke testing.

## Idempotence and Recovery

`npm install` can be re-run safely after edits to `package.json`. If the override causes an install or build regression, revert only the dependency-hardening changes in `package.json`, `package-lock.json`, and the regression test, then restore the previous lockfile state with a normal install. Do not use `npm audit fix --force` or downgrade `vite-plugin-pwa`.

## Outcomes & Retrospective

Implemented the repo-local remediation with a root `overrides` entry scoped to `workbox-build`, refreshed the lockfile, and added a regression test that asserts both the declared override and the resolved patched versions. Verification is complete for install, audit, lint, build, and preview startup. No remaining advisory was reported by `npm audit`, so there is no unresolved repo-local risk to document at this time beyond the normal tradeoff that this remains an intentional override until upstream packages adopt the newer `@rollup/plugin-terser` line themselves.

---

# Make PR Vault filters multi-select

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Users can combine multiple workout filters in the PR Vault instead of being limited to one active workout at a time. Tapping `ALL` becomes a convenience toggle: it selects every available workout filter when the current selection is partial, and clears all workout filters when every workout is already selected. Users can tell it works because the PR card grid updates correctly for one filter, multiple filters, all filters, and no filters.

## Context and Orientation

[`src/pages/PRVault.tsx`](c:\Users\carve\OneDrive\Projects\workout\src\pages\PRVault.tsx) owns the current banner state and renders the filter buttons plus the PR card grid. [`src/lib/pr-vault.ts`](c:\Users\carve\OneDrive\Projects\workout\src\lib\pr-vault.ts) already provides the data-driven filter option list and the filtering function, so it is the right place to define the new multi-select semantics without coupling the page to a hard-coded filter list. [`src/lib/pr-vault.test.ts`](c:\Users\carve\OneDrive\Projects\workout\src\lib\pr-vault.test.ts) contains the focused unit tests for this logic and will be used for TDD.

## Progress

- [x] 2026-04-02 20:45 America/Chicago: Reviewed the current `PRVault` page, `pr-vault` helper, and existing tests.
- [x] 2026-04-02 20:49 America/Chicago: Added failing tests for multi-select filtering and `ALL` toggle behavior, then implemented the helper API until the focused `pr-vault` tests passed.
- [x] 2026-04-02 20:52 America/Chicago: Updated shared PR Vault filter helpers for array-based selection and `ALL` convenience toggling.
- [x] 2026-04-02 20:54 America/Chicago: Updated the PR Vault page to use multi-select filter state with per-chip selected styling and `ALL` active only when every workout filter is selected.
- [x] 2026-04-02 21:38 America/Chicago: Ran `npm run lint` and `npm run build`, then manually validated one-filter, multi-filter, `ALL` select-all, and `ALL` clear-all behavior in preview.

## Decision Log

- Decision: Keep the filter state local to `PRVault` and move only the selection/filtering rules into `src/lib/pr-vault.ts`.
  Rationale: The selection is page-local UI state, but the rule set needs to stay compatible with the separate work that derives the filter list from actual PR data.
  Date/Author: 2026-04-02 / Codex

## Surprises & Discoveries

- Observation: The current helper already deduplicates filter labels from actual PR data and normalizes names case-insensitively.
  Evidence: `getPrFilterOptions` and `filterPrsByExercise` in `src/lib/pr-vault.ts`.
- Observation: Treating an empty selection as “show all PRs” makes the new `ALL` clear-all behavior visually indistinguishable from select-all.
  Evidence: The requested manual validation cases only become meaningfully distinct when an empty selection produces the PR Vault empty state.
- Observation: `npm run preview` still requires running outside the sandbox in this repo because Vite config loading hits an `esbuild` `spawn EPERM` failure inside the sandbox.
  Evidence: sandboxed preview run failed before the escalated preview verification.

## Plan of Work

Add focused regression coverage in `src/lib/pr-vault.test.ts` for filtering by one selected workout, multiple selected workouts, and toggling `ALL` between “select everything” and “clear everything.” Then update `src/lib/pr-vault.ts` so the option list remains data-driven while the filtering API accepts a list of selected workouts plus a small helper to compute the next selection when a filter chip is pressed. After the helper contract is stable, update `src/pages/PRVault.tsx` to store selected workout filters as an array, render active state per chip, treat `ALL` as selected only when every workout filter is selected, and ensure the empty selection renders no PR cards so clearing via `ALL` behaves distinctly from showing all results.

## Validation and Acceptance

- Run `npm test -- src/lib/pr-vault.test.ts` and confirm the new tests fail before implementation, then pass after the helper and page updates.
- Run `npm run lint` and confirm there are no TypeScript errors.
- Run `npm run build` and confirm the production bundle succeeds.
- Manually confirm in the app that:
  - selecting one workout filter shows only that workout’s PR cards
  - selecting multiple workout filters shows the union of those PR cards
  - tapping `ALL` from a partial selection activates every workout filter
  - tapping `ALL` when every workout filter is active clears the workout filters and the card grid

## Idempotence and Recovery

These changes are safe to re-run because the filter state is transient UI state and no persisted data model is changing. If a helper or UI edit regresses the page, revert only the `PRVault` and `pr-vault` files plus the associated test updates, then rerun `npm run lint` and `npm run build`.

## Outcomes & Retrospective

Implemented multi-select PR Vault filters without adding dependencies. The shared helper now keeps the filter list data-driven from PR data, supports combined workout selections, and treats `ALL` as a select-all or clear-all convenience toggle. The page now keeps per-chip visual state clear on mobile and desktop, starts with all available workouts selected, and shows the empty state when the user clears every workout filter.

Verification completed with `npm test -- src/lib/pr-vault.test.ts`, `npm run lint`, `npm run build`, and manual preview checks for one selected filter, multiple selected filters, `ALL` selecting every workout, and `ALL` clearing every workout. One cleanup item remains external to the code changes: the preview `node` listener on port `4173` could not be stopped from the sandboxed session because of process permissions.

---

# Extend plan management on the Plans screen

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

Users can manage existing plans from the `YOUR PROTOCOLS` section on the Plans screen instead of only activating one. Each saved plan should now support `Edit`, `Restart`, and `Delete` with mobile-friendly controls and safe behavior. Editing must update the existing plan in place instead of creating a duplicate, restarting must reset progress to week 1/day 1 without changing the plan structure, and deleting must remove the plan from storage while leaving the app in a valid state if the deleted plan was active.

## Context and Orientation

[`src/App.tsx`](C:\Users\carve\OneDrive\Projects\workout\src\App.tsx) currently owns both the Plans screen UI and all plan state mutations. The `TrainingPlans` component renders the `YOUR PROTOCOLS` list and currently only exposes selection. The `CreatePlan` component is the existing full-screen plan editor used for creation and already holds the schedule-editing UI, so it is the natural place to reuse for editing an existing plan. [`src/lib/backup.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\backup.ts) is the compatibility boundary for stored plans and imported backups, so the stored `TrainingPlan` shape should remain unchanged. [`src/lib/plan-progress.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\plan-progress.ts) contains the existing progress rules and is the right model reference for restart behavior. New pure helper logic for plan mutations can live in [`src/lib/plans.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\plans.ts) with focused regression coverage in [`src/lib/plans.test.ts`](C:\Users\carve\OneDrive\Projects\workout\src\lib\plans.test.ts).

## Progress

- [x] 2026-04-02 23:11 America/Chicago: Reviewed `App.tsx`, `backup.ts`, and `plan-progress.ts` to map current plan creation, selection, persistence, and advancement behavior.
- [x] 2026-04-02 23:23 America/Chicago: Added failing tests for restart, in-place replacement, edit-progress clamping, and active/non-active deletion behavior in `src/lib/plans.test.ts`, then verified the missing helper export/module failures before implementation.
- [x] 2026-04-02 23:34 America/Chicago: Implemented `src/lib/plans.ts` and rewired `src/App.tsx` so create/edit/restart/delete flows use pure helpers instead of ad-hoc array mutations.
- [x] 2026-04-02 23:46 America/Chicago: Updated the `YOUR PROTOCOLS` cards with touch-friendly `EDIT`, `RESET`, and `DELETE` actions and reused the existing plan editor for in-place editing via `?edit=<planId>`.
- [x] 2026-04-02 22:43 America/Chicago: Ran `npm run lint` and `npm run build`, then manually validated edit persistence, restart reset, deletion of active/non-active plans, and post-delete plan selection in preview with Playwright.

## Decision Log

- Decision: Keep the persisted `TrainingPlan` schema unchanged and add pure helper functions around the existing array state instead of introducing a migration.
  Rationale: The requested behavior can be delivered by changing mutation semantics and UI affordances only, which preserves backward compatibility for localStorage and backup import/export.
  Date/Author: 2026-04-02 / Codex
- Decision: Reuse the existing create-plan route for editing by loading the target plan from the `?edit=<planId>` query string instead of introducing a second editor component.
  Rationale: The current editor already contains the full mobile plan-building workflow. Reusing it avoids duplicate UI logic while still making edit mode explicit and direct-linkable.
  Date/Author: 2026-04-02 / Codex
- Decision: Keep delete behavior conservative by clearing `activePlanId` when the deleted plan was active, rather than auto-selecting a replacement plan.
  Rationale: The app already has a clear no-active-plan state, and automatically switching the user to another protocol could be surprising after a destructive action.
  Date/Author: 2026-04-02 / Codex

## Surprises & Discoveries

- Observation: `CreatePlan` currently always generates a fresh `id` and `handleSavePlan` always appends, which guarantees accidental duplication if reused for editing without new save semantics.
  Evidence: `CreatePlan.handleSave` and `handleSavePlan` in `src/App.tsx`.
- Observation: The app already treats `activePlanId` as nullable and falls back to the “NO PLAN SELECTED” state cleanly when there is no active plan.
  Evidence: root route rendering logic in `src/App.tsx`.
- Observation: Restart behavior only needs to touch `currentWeek` and `currentDay`; workout logs live on `Exercise` records, not inside `TrainingPlan`.
  Evidence: `TrainingPlan` in `src/types.ts` and `advancePlanProgress` in `src/lib/plan-progress.ts`.
- Observation: Preview on port `4173` was already running when manual validation started, so the verification reused the existing server instead of killing processes from the sandbox.
  Evidence: `vite preview` startup returned `Port 4173 is already in use`, followed by a successful `STATUS=200` response from `http://127.0.0.1:4173`.

## Plan of Work

First, add a small pure helper module for plan mutations so restart, update, and delete behavior can be tested independently of React rendering. The tests should prove that restarting a plan resets progress counters without changing schedule or metadata, that saving an edited plan replaces the matching plan by `id` instead of appending a duplicate, and that deleting a plan returns a valid next `activePlanId` when the removed plan was active or leaves other plans untouched when it was not. After the helper contract is pinned down, update `App.tsx` to use those helpers, support an edit-mode `CreatePlan` flow seeded from an existing plan, and keep exercise creation logic compatible with both brand-new and edited plans. Finally, update the `YOUR PROTOCOLS` cards so each plan has clear tap targets for select, edit, restart, and delete, with lightweight confirmation UI for destructive actions that works well on small screens.

## Validation and Acceptance

- Run `npm test -- src/lib/plans.test.ts` and confirm the new tests fail before implementation, then pass after the helper logic is added.
- Run `npm run lint` and confirm there are no TypeScript errors.
- Run `npm run build` and confirm the production bundle succeeds.
- Manually confirm in the app that:
  - editing an existing plan persists changes without creating a duplicate
  - restarting a plan resets it to week 1/day 1
  - deleting a non-active plan removes it cleanly
  - deleting the active plan leaves the app in a valid no-active-plan or fallback-active-plan state
  - selecting a remaining plan still works after delete/restart/edit operations

## Idempotence and Recovery

These changes are safe to retry because they do not change the serialized plan schema in storage. If a regression appears, revert the new helper module, its tests, and the related `App.tsx` edits together so the UI and mutation logic stay aligned, then rerun `npm run lint` and `npm run build` before retrying. Stored plans should remain readable throughout because `backup.ts` validation is not being tightened.

## Outcomes & Retrospective

Implemented plan management actions on the Plans screen without changing the stored `TrainingPlan` schema. The `YOUR PROTOCOLS` cards now expose mobile-friendly `EDIT`, `RESET`, and `DELETE` buttons; the editor route can load an existing plan in place; restart resets progress to week 1/day 1; delete removes the plan cleanly and clears the active plan when necessary; and plan selection continues to work after those actions.

Verification is complete for the requested scope. The work added regression coverage in `src/lib/plans.test.ts`, passed `npm run lint` and `npm run build`, and manual preview checks confirmed edit persistence without duplication, restart reset behavior, non-active delete behavior, active delete fallback to a valid no-active state, and successful selection of a remaining plan afterward.
