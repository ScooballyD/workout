# Persistent Workout Drafts Design

## Goal

Keep unlogged weight and rep edits when users leave an exercise-detail screen, force-close and relaunch the Android app, then log the next set from Grind. Unfinished edits must never be represented as completed exercise logs or exported in backups.

## Data Model

Persist a separate, versioned `workout_drafts` local-storage record. Each draft is keyed by the active plan identity, current plan-day identity, exercise identity, and set index. A draft stores weight, reps, and the existing `default`, `manual`, or `propagated` source metadata for both values.

The draft record is intentionally outside the exercise, plan, PR, and backup schemas. This preserves the sparse `Exercise.logs` model: a set is not a log until the user explicitly logs it.

Malformed or obsolete stored draft data is discarded at the draft-storage normalization boundary. Valid drafts whose referenced plan, plan day, exercise, or set no longer exists are pruned rather than applied to a new context.

## UI And Logging Flow

The exercise-detail editor writes through to the draft store whenever the user edits weight or reps. Its local controlled input state rehydrates from that store when the route mounts.

Grind resolves the next-set display and `LOG NEXT SET` values from the same draft when one matches the active workout context. Logging converts that draft into the normal completed `SetLog` and deletes only the consumed draft. Match-weight propagation retains its existing source semantics and updates the affected unfinished drafts consistently.

## Unit Changes

When the user changes units, convert every persisted draft weight with the same pounds/kilograms conversion used by the app's normal weight values. Preserve reps and all source metadata. Do not discard a valid unfinished draft merely because units changed.

## Cleanup Boundaries

Remove or prune drafts when their context is invalidated:

- a draft's set is logged
- the current workout is completed
- a plan is restarted or deleted
- an exercise is deleted
- data is imported or wiped
- active-plan or current-day changes make a draft stale

Drafts are not included in export payloads. Import begins with no drafts, so imported data cannot inherit unfinished inputs from the replaced local workout state.

## Verification

Add focused helper and storage tests for parsing, context matching, logging consumption, stale-draft pruning, unit conversion, and cleanup. Verify on Android that an edited set survives route exit and force-close/relaunch, appears on Grind, logs correctly, and disappears after logging or context invalidation. Run `npm test`, `npm run lint`, `npm run build:android:web`, and `npm run sync:android`.
