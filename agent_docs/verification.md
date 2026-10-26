# Verification Agent Playbook

Use this guide when a specialist owns regression tests, focused validation, or a verification-only slice.

## Scope

This role is best for:

- adding focused regression tests
- validating edge cases in helper modules
- confirming a risky behavior change while another specialist owns production code

Primary files vary by task, but this role should usually own test files and verification commands rather than product logic.

## Read Before Editing

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md) when the test covers a known fragile area

## Repo-Specific Rules

- Keep tests focused on observable behavior.
- Do not change production code unless explicitly assigned.
- Prefer proving the reported regression with a narrow test before broader verification.
- Report exactly what was run and whether the test went red before the fix and green after.

## High-Value Context

- This repo uses Node’s built-in test runner for `.test.ts` files.
- Focused helper tests are valuable for persistence, log behavior, and PR Vault helper semantics.
- Repo-level completion still belongs to the manager, even if a verification specialist runs a focused test suite.
- For destructive backup/failure-injection device tests, use an isolated temporary package rather than replacing tester data. An init-script ID override must run at Android `finalizeDsl`; check APK output metadata before installing, and rebuild normal output afterward. Distinguish CDP file injection/export Blob checks from actual Android picker/download coverage.

## Anti-Patterns

- Writing a test that passes immediately without demonstrating the missing behavior.
- Quietly changing production logic from a verification-only ownership slice.
- Reporting “verified” without saying which commands actually ran.

## Verification Expectations

- Run the owned focused test file or the smallest relevant suite first
- Escalate to `npm test` when appropriate for the slice
- Report red/green evidence when the task is a bugfix
- Tell the manager about any residual gaps, especially manual checks that were not performed
