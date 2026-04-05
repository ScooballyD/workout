# Plan-Local Sets, PR Vault Muscle Filters, And Workout UI Follow-Through

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as work proceeds.

## Purpose / User Outcome

The remaining user-facing work falls into four outcomes:

1. The create-plan summary should describe the plan’s actual muscle-group emphasis instead of placeholder text.
2. Exercise set counts should start at `2` and progress independently inside each plan rather than mutating one global exercise record across plans.
3. PR Vault filters should operate by muscle group instead of by exercise name.
4. Grind cards should show the next set’s weight alongside reps, and completed exercises should show `-` instead of a misleading fallback target.

## Context and Orientation

Task 2 is the anchor because it is a persistence/schema change. Today, [src/types.ts](C:/Users/carve/OneDrive/Projects/workout/src/types.ts) stores `sets` on the shared global `Exercise`, [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx) mutates that field through add/remove-set handlers, and helpers like [src/lib/deload.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/deload.ts), [src/lib/exercise-log-inputs.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/exercise-log-inputs.ts), and [src/lib/next-set-info.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/next-set-info.ts) read from it directly. Implementing plan-local progression will likely require new persisted plan-scoped exercise-state data plus normalization updates in [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts).

Task 3 is mostly isolated to [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts), [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx), and exercise-tag lookups in [src/lib/exercise-tags.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/exercise-tags.ts). It should land after task 2 so the manager is not integrating multiple conceptual changes at once.

Tasks 1 and 4 both live mainly in [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx), with task 4 also relying on [src/lib/next-set-info.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/next-set-info.ts). They should land after task 2 so the UI reflects the final plan-local set behavior rather than the old global-set model.

## Progress

- [x] 2026-04-04 22:41 America/Chicago: Reviewed the remaining `todo.md` tasks and confirmed task 2 is the schema/persistence anchor.
- [x] 2026-04-04 22:44 America/Chicago: Read the persistence, frontend, PR Vault, and repo-memory docs plus the affected helpers and tests.
- [x] 2026-04-04 23:16 America/Chicago: Delegated, integrated, and locally verified task 2 plan-local set progression and schema normalization updates.
- [x] 2026-04-04 23:31 America/Chicago: Delegated, integrated, and locally verified task 3 PR Vault muscle-group filters, with a manager-side correction to pass the live exercise catalog from app state instead of rereading storage inside the page.
- [x] 2026-04-04 23:56 America/Chicago: Delegated, integrated, and locally verified tasks 1 and 4 in the create-plan summary and Grind-card UI.
- [x] 2026-04-05 00:07 America/Chicago: Ran final repo verification, updated `todo.md`, and completed the execution record.

## Decision Log

- Decision: Execute task 2 first.
  Rationale: It is the only schema/persistence change and other remaining UI work should build on its final behavior.
  Date/Author: 2026-04-04 / Codex

- Decision: Sequence task 3 after task 2, then finish with tasks 1 and 4 together.
  Rationale: Task 3 is logically independent but still benefits from calmer integration, while tasks 1 and 4 overlap heavily in `src/App.tsx`.
  Date/Author: 2026-04-04 / Codex

## Surprises & Discoveries

- Observation: The repo still seeded default exercise set counts through global `Exercise.sets` values in [src/constants.ts](C:/Users/carve/OneDrive/Projects/workout/src/constants.ts), and new plan-created exercises still defaulted to `sets: 3` in [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx).
  Evidence: [src/constants.ts](C:/Users/carve/OneDrive/Projects/workout/src/constants.ts), [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx)
  Resolution: Plans now persist isolated `exerciseSetCounts`, new exercises start at `2`, and restart/edit flows rebuild the per-plan count map safely.

- Observation: PR Vault filters originally only knew about PR exercise names and did not look up muscle groups.
  Evidence: [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts)
  Resolution: Filter derivation now resolves muscle groups through the exercise catalog, preserves `ALL` semantics in helper code, and falls back to `Other` for missing or invalid tags.

- Observation: Letting the PR Vault page reread persisted exercises from `localStorage` would have created a second source of truth for filter derivation.
  Evidence: manager integration review of [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx)
  Resolution: The page now receives `exercises` directly from [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx), keeping the screen state-driven instead of storage-driven.

## Plan of Work

First, delegate task 2 to a persistence specialist that owns the schema and plan-local progression surface: [src/types.ts](C:/Users/carve/OneDrive/Projects/workout/src/types.ts), [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts), the set/progress helpers, relevant tests, and only the necessary `App.tsx` integration points. After that lands, delegate task 3 to a PR Vault specialist that updates filter derivation, selection semantics, and fallback muscle-group handling in the PR layer plus focused tests. Finally, delegate one frontend/app-flow specialist to finish tasks 1 and 4 together in [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx) and any helper/test files needed for next-set display logic, keeping the UI aligned with the new plan-local set model.

After the three slices are integrated, run full repo verification, update `codex.md` or a role playbook if new durable guidance emerged, and remove the completed tasks from [todo.md](C:/Users/carve/OneDrive/Projects/workout/todo.md) with concise completion summaries.

## Validation and Acceptance

- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run preview`
- Manually confirm that different plans no longer cross-contaminate set progression and both start from a `2`-set baseline when appropriate
- Manually confirm that PR Vault filter chips operate by muscle group and still support meaningful empty/multi-select behavior
- Manually confirm that the create-plan summary updates from actual plan muscle-group composition and that Grind cards show next-set weight plus reps or `-` when complete

## Idempotence and Recovery

If task 2 becomes unstable, retry from the schema and normalization boundary instead of layering more UI conditionals on top of the global `Exercise.sets` model. If task 3 regresses semantics, restore the helper-owned filter behavior before touching the PR page UI. If tasks 1 and 4 become noisy in `App.tsx`, keep the UI pass focused on summary derivation and Grind-card display only, leaving plan-local state logic to the already integrated persistence slice. Revert helper and test changes together if a slice partially lands.

## Outcomes & Retrospective

Completed on 2026-04-05. The persistence-first sequencing worked as intended: plan-local set progression landed first, the PR Vault filter conversion stayed isolated in helper/page code, and the final `App.tsx` pass only had to focus on user-facing summary and target-display behavior. Full repo verification passed with `npm test`, `npm run lint`, and `npm run build`; preview also served successfully on `http://127.0.0.1:4175/` after the default preview port was already occupied in this session. Manual interactive browser checks were still limited by the current environment, so the closeout relies on code review plus command-level verification rather than a full live UI walkthrough.
