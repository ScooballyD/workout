# Main Protection Implementation Plan

## Purpose / User Outcome

Require reviewed pull-request workflow and passing existing CI for updates to
`ScooballyD/workout` main, and prevent force pushes/deletion without locking
the sole maintainer out of ordinary merges.

## Context And Orientation

`todo.md` task 3 tracks this work. `.github/workflows/ci.yml` runs dependency
installation, TypeScript and production build on PRs and main pushes. GitHub
reports the check as `validate`, emitted by GitHub Actions (App ID 15368).
The repository is public, the current account has admin access, and no
repository/parent rulesets exist. Main currently reports `protected: false`.
Previous uncommitted application changes are outside this task.

## Progress

- [x] 2026-10-23 America/Chicago: Inspected audit, workflow, authenticated access, existing rules and actual CI check source.
- [x] 2026-10-23 America/Chicago: Independent read-only review found no payload issues.
- [x] Created active main-only ruleset 25725567; no existing rules were replaced.
- [x] Readback confirmed all four effective rules, no bypass, and `protected: true`; main tip unchanged.
- [x] Documented policy and verification limits in `docs/github/main-protection.md` and completed task tracking.

## Decision Log

- Use an active branch ruleset scoped to `refs/heads/main`, with no bypass actors.
- Require pull requests with zero approvals: GitHub does not allow an author to approve their own PR. No code-owner/last-pusher approval requirement.
- Require the observed `validate` check from GitHub Actions App 15368 and an up-to-date base branch. Do not invent a unit-test check absent from CI.
- Block deletion and non-fast-forward updates. Require review conversations resolved before merge.
- Do not create a test commit/PR, push, merge, or attempt a destructive operation solely to exercise protection. Inspect existing PR check evidence and state any remaining live-flow verification limit.

## Surprises & Discoveries

Sandboxed `gh auth status` reported an invalid token, but the approved host
execution successfully used the Windows keyring. Do not ask for a new token
before checking this environment-specific access issue, and never print tokens.

## Plan Of Work

1. Add `docs/github/main-ruleset.json` containing the reviewed desired payload and ask a read-only specialist to check lockout/bypass risks.
2. Use authenticated `gh api` to create only the new ruleset after confirming existing settings. Read back the full ruleset and effective rules.
3. Add `docs/github/main-protection.md` with policy and exact verification evidence, then update todo and durable build/process guidance.

## Validation And Acceptance

Validate payload JSON locally. Use GitHub API evidence for active enforcement,
empty bypass list, PR requirement, exact required check/source, strict checks,
deletion and force-push blocks. Inspect existing PR CI checks; distinguish
historical evidence from a merge under the new policy. No app code or workflow
changes are planned, so app checks are not rerun for this settings/docs task.

## Idempotence And Recovery

Read current rulesets before applying. If the named policy already exists,
inspect it instead of creating a duplicate. Keep all unrelated policies intact.
An administrator can deliberately edit the ruleset for recovery; no actor has
routine bypass rights. Do not weaken protection automatically on an API error.

## Outcomes & Retrospective

Active ruleset 25725567 now requires PRs and the observed GitHub Actions
`validate` check with strict/up-to-date enforcement, blocks force pushes and
deletion, and has no bypass actors. Zero review approvals preserves the
sole-maintainer workflow. GitHub accepted enforcement without plan/access
limitations. Independent review and local JSON validation passed.

Existing PR #4 and its successful pull_request-triggered CI run 36911987760
confirm the configured check is emitted by the normal workflow. No PR was open,
and no new PR/commit/push/merge was performed; the next ordinary PR must supply
the first merge observation under the new policy. App tests/builds were not
rerun because this task changed only remote settings and documentation.
