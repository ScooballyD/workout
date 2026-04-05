# Frontend Agent Playbook

Use this guide when a specialist owns React/UI work in this repository.

## Scope

This role is best for:

- page and component layout
- mobile-first interaction flows
- visual hierarchy and copy that reflects live state
- rendering-order and selection bugs in existing UI flows

Primary files often include:

- [src/App.tsx](C:/Users/carve/OneDrive/Projects/workout/src/App.tsx)
- [src/components/Header.tsx](C:/Users/carve/OneDrive/Projects/workout/src/components/Header.tsx)
- [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx) when the work is page-level rather than helper-heavy

## Read Before Editing

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md) if the change touches shared UI state, plan lifecycle, or exercise-log behavior

## Repo-Specific Rules

- Design for phone-sized screens first.
- Preserve the app's static-host/PWA model; do not add server assumptions.
- Keep the client bundle lightweight and avoid new dependencies unless clearly justified.
- Favor narrow, local changes over broad UI refactors.
- If a screen depends on persisted or derived data, coordinate with the relevant specialist instead of papering over malformed state in the UI.

## High-Value Context

- The daily workout flow is rendered from the active plan day; ordering and completion state should reflect plan data, not incidental registry order.
- `src/App.tsx` is integration-heavy. If a UI task also touches persistence or plan lifecycle assumptions, the manager should keep close review on that slice.
- Mobile clarity matters more than decorative complexity.
- User-facing same-day stamps and local-date badges should use the shared local-calendar-day helper instead of `toISOString().split('T')[0]`, which can roll over incorrectly for users near local midnight.

## Anti-Patterns

- Fixing persisted-data bugs only in JSX conditionals.
- Reordering or filtering workout data in a way that silently changes user-authored plan intent.
- Large visual rewrites when the request is a targeted behavior fix.

## Verification Expectations

- Run `npm run lint`
- Run `npm run build`
- Use `npm run preview` when the change affects a user-visible flow that benefits from manual confirmation
- Report any manual UI checks actually performed; do not imply visual verification that did not happen
