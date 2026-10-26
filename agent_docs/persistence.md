# Persistence Agent Playbook

Use this guide when a specialist owns storage, schema, backup, or plan-lifecycle work.

## Scope

This role is best for:

- `localStorage` normalization and parsing
- backup import/export validation
- persisted type evolution and backward compatibility
- plan lifecycle and schedule safety
- exercise log history behavior

Primary files often include:

- [src/types.ts](C:/Users/carve/OneDrive/Projects/workout/src/types.ts)
- [src/lib/backup.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/backup.ts)
- [src/lib/plan-progress.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plan-progress.ts)
- [src/lib/plans.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/plans.ts)
- [src/lib/workout-completion.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/workout-completion.ts)

## Read Before Editing

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md)

## Repo-Specific Rules

- Treat persisted data changes as schema changes.
- Fix malformed data at the normalization boundary when possible instead of masking it later in UI code.
- Preserve backward compatibility for valid older data and backups where practical.
- Be explicit and conservative when a malformed shape should be rejected rather than silently repaired.

## High-Value Context

- Backup import must stay strict; imported data should be treated as `unknown` until validated.
- Exercise logs and last logs are sparse arrays; code must tolerate `undefined` entries.
- Plan lifecycle changes often span types, normalization, progress helpers, and app wiring.
- Deload behavior depends on explicit persisted plan metadata rather than inference.
- `src/lib/data-limits.ts` owns import/restore resource bounds. Reject excessive counts and collections before allocation/rendering; do not silently truncate saved plans or history.
- Generated schedule descriptions have their own derived bound (name count * name length + separators), not the single-name text cap. Test editor output through persistence/export/migration whenever producer or validator limits change.
- Primary state and drafts now commit through the single `workout_state_v1` snapshot in `src/lib/workout-storage.ts`. Import must persist successfully before the UI adopts the new data; independent per-field storage writes can create partial imports.
- Invalid/unreadable saved data pauses automatic saving so fallback defaults cannot overwrite the original. Preserve legacy keys during migration failure; explicit reset must handle stale legacy copies too.
- Keep recovery protection independent of warning text/kind: failed import/export/reset must not unlock autosave. Raw saved-data recovery exports are distinct from normal backups and current-session exports.
- Backups keep the version-1 export shape and exclude unfinished drafts. Test ordinary exports for re-import compatibility with the byte limit, and use isolated fake/browser storage for quota and recovery scenarios.

## Anti-Patterns

- Changing `src/types.ts` without updating normalization and focused tests.
- Patching `src/App.tsx` to tolerate invalid persisted shapes that should have been rejected earlier.
- Silent data rewriting that changes valid user plans in unexpected ways.

## Verification Expectations

- Add or update focused storage/helper tests
- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Use `npm run preview` when backup import, routing, or active-plan behavior is affected
