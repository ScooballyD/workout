# PR Vault Agent Playbook

Use this guide when a specialist owns PR Vault filtering, charting, or exercise-to-summary display behavior.

## Scope

This role is best for:

- [src/pages/PRVault.tsx](C:/Users/carve/OneDrive/Projects/workout/src/pages/PRVault.tsx)
- [src/lib/pr-vault.ts](C:/Users/carve/OneDrive/Projects/workout/src/lib/pr-vault.ts)
- focused PR Vault tests and helper logic

## Read Before Editing

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md)

## Repo-Specific Rules

- Keep filter semantics in helper code rather than scattering them through the page.
- Keep the page data-driven; filters and charts should derive from real PR data.
- Preserve mobile readability and avoid overcomplicating the page UI.

## High-Value Context

- `ALL` is a convenience toggle, not a normal exclusive filter.
- Empty selection behavior is meaningful and should not be changed casually.
- Chart scaling should remain relative enough to communicate both light and heavy progression clearly.

## Anti-Patterns

- Hard-coding filter categories that do not reflect actual PR data.
- Reimplementing selection semantics independently in the page.
- Flattening chart domains so progression becomes visually misleading.

## Verification Expectations

- Add or update focused helper/page tests where behavior changes
- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Manually confirm no-data, single-filter, and multi-filter states when practical
