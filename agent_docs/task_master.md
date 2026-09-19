# Task Master Guide

Use this file when acting as a manager agent for work in this repository.

The goal is not to be another general repo guide. This document explains how to run other agents effectively in this codebase: how to triage tasks, when to delegate, how to assign ownership, how to avoid overlapping edits, and how to integrate and verify the final result.

This guide is aligned with the manager-style multi-agent pattern from the OpenAI Agents SDK: the manager stays in control, delegates bounded work to specialists, collects outputs, and decides what ships. Prefer that pattern here over loose handoffs unless the task genuinely benefits from a full ownership transfer.

Favor sequencing specialists over running them in parallel. This is slower, but it raises the safety bar in a repo with several fragile shared-state and lifecycle areas.

## What The Manager Agent Owns

The manager agent is responsible for:

- understanding the user request in repo context
- reading the current repo rules before delegating
- deciding whether the task should be done locally or split across agents
- creating or maintaining a plan for large or risky work
- assigning clear, non-overlapping ownership to specialists
- keeping persistence, PWA, and shared UI changes coherent across the codebase
- integrating results and resolving conflicts
- running or confirming final verification before claiming completion
- updating durable docs when a new repo-specific failure pattern is discovered

The manager agent should not behave like a passive dispatcher. It stays accountable for the final answer.

The manager also owns the quality of the role playbooks in `agent_docs/`. When a task reveals new high-value, role-specific guidance that is likely to matter again, append that guidance to the relevant role playbook before finishing. If a role playbook contains stale, duplicated, or no-longer-useful guidance, prune it instead of letting the document grow into an archive.

## Read Order Before Delegating

Before delegating any non-trivial work, read these in order:

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md) when the task touches persistence, plan lifecycle, PWA/build config, or shared UI state
4. [agent_docs/plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) when the task is large, risky, or handoff-prone
5. [todo.md](C:/Users/carve/OneDrive/Projects/workout/todo.md) if the work should align with an existing tracked task

Do not delegate from memory alone when the task touches a fragile area already called out in `codex.md`.

Before dispatching a specialist, also read the matching role playbook when one exists:

- [agent_docs/frontend.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/frontend.md)
- [agent_docs/persistence.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/persistence.md)
- [agent_docs/pwa-build.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/pwa-build.md)
- [agent_docs/pr-vault.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/pr-vault.md)
- [agent_docs/docs-process.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/docs-process.md)
- [agent_docs/verification.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/verification.md)

The manager should also tell the specialist to read the matching role playbook before implementation, or explicitly pass along the relevant constraints from that playbook in the delegation prompt. Do not assume the worker will discover the playbook automatically.

## This Repo's Real Specialist Domains

This repo is currently a static Vite + React + TypeScript PWA. There is no runtime backend in the current product architecture.

That means the useful specialist roles in this repo are closer to these:

- **Frontend/UI agent**
  Best for React components, layout, styling, card flows, and mobile UX polish.

- **State and persistence agent**
  Best for `localStorage`, backup import/export, schema normalization, plan lifecycle, exercise logs, and backward compatibility.

- **PWA/build agent**
  Best for `vite.config.ts`, manifest behavior, preview/build flows, dependency hardening, and static-host constraints.

- **PR Vault/data-display agent**
  Best for PR charts, filters, derived summaries, and data-to-UI mapping.

- **Docs/process agent**
  Best for `AGENTS.md`, `agent_docs/*`, `todo.md`, plans, onboarding docs, and task hygiene.

- **Test/verification agent**
  Best for adding focused tests, checking edge cases, and validating risky helpers without owning the product decision.

If this repo later grows a real backend, then a backend specialist can be added. Today, calling something a backend task is usually a sign the problem has not been mapped onto the actual codebase yet.

## When To Delegate

Delegate when:

- the work naturally splits into independent file sets
- one task is blocked on repo knowledge while another can proceed in parallel
- a risky change needs focused verification in parallel with implementation
- a substantial task has a clear specialist slice, such as UI work vs persistence work

Even when delegation is appropriate, default to sequential delegation unless the slices are clearly independent and there is a concrete benefit to parallel execution.

Do not delegate when:

- creating a new task in the todo.md
- the next step is short and faster to do locally
- the task is tightly coupled and every decision depends on the last one
- you cannot define clean ownership boundaries
- you would create duplicate investigation across agents

For this repo, keep the critical-path integration work local when the task crosses:

- `src/App.tsx`
- `src/lib/backup.ts`
- `src/lib/plan-progress.ts`
- `vite.config.ts`

Those areas often need one person to keep the full behavior coherent.

When the work is fragile but still delegable, prefer sequencing specialists through the area one at a time instead of running multiple agents concurrently.

## Preferred Coordination Pattern

For this repo, use a manager pattern, not a loose handoff pattern, by default.

That means:

- the manager keeps the user-facing thread
- specialists get bounded tasks
- specialists return findings, patches, or verification results
- the manager decides how those results fit together

The default execution order should usually be:

- specialist A implements a slice
- manager reviews and integrates that result
- specialist B handles the next slice or verification work

Do not parallelize by reflex. Use parallel delegation only when ownership is fully disjoint, the tasks do not depend on each other's findings, and sequencing provides little additional safety.

Use full handoff-style ownership only when one agent can safely own a complete slice end to end without stepping on other work, such as a self-contained doc cleanup or a small isolated helper module change.

## Model Selection By Specialist Role

Choose a specialist model from the role matrix below, then increase capability when the task's actual risk warrants it. Role is a starting point, not a substitute for risk assessment.

| Role | Default model and effort | Use for |
| --- | --- | --- |
| `code-explorer` | GPT-5.6 Luna / low | Read-only repository discovery and decision-ready findings. |
| `quick-implementer` | GPT-5.6 Luna / low | Mechanical, isolated, low-risk one- or two-file edits with focused checks. |
| `implementer` | GPT-5.6 Luna / medium | Bounded features and bug fixes, including targeted unit tests. |
| `high-risk-implementer` | GPT-5.6 Sol / medium | Persistence, routing, Android lifecycle, complex React state, backup/schema, and other fragile behavior. |
| `code-validator` | GPT-5.6 Luna / low | Read-only focused test, build, lint, type-check, and diff verification. |
| `code-reviewer` | GPT-5.6 Sol / medium | Read-only review of risky, stateful, security-sensitive, public-facing, or difficult changes. |
| `docs-process` | GPT-5.6 Luna / low | Documentation, task tracking, plans, and durable repository process updates. |
| `commit-pusher` | GPT-5.6 Luna / low | Explicitly requested staging, conventional commits, and pushes. |

Escalate to the `high-risk-implementer` and `code-reviewer` path even for small edits when they touch `src/App.tsx`, persistence, Capacitor, plan lifecycle, backup/schema, or another known fragile area. A lower-risk implementation still needs a Sol review when its user impact or failure mode is high.

The manager retains final verification and shipping approval. A `commit-pusher` must never choose files to stage or publish changes without an explicit file list and direct user authorization to commit or push.

Model availability varies by environment and can change. Before dispatching, the manager must confirm the requested model and effort are available. If not, record the fallback in the delegation prompt and choose the closest available model that preserves the required risk level; do not silently downgrade a high-risk task.

## Delegation Workflow

### 1. Triage the request

Classify the task first:

- UI only
- helper logic
- persistence/schema
- plan lifecycle
- PR Vault/data display
- PWA/build
- documentation/process
- mixed

If it is mixed, decide whether the slices can be separated without shared writes.

### 2. Decide whether a plan is required

Use [agent_docs/plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) when the task is:

- multi-file
- persistence-sensitive
- PWA-sensitive
- likely to need handoff
- likely to take multiple iterations

The manager owns the plan and keeps it current.

### 3. Split by write ownership

Assign each specialist a disjoint write set whenever possible.

After splitting ownership, decide whether the slices should be executed sequentially. In this repo, the answer should usually be yes unless the slices are plainly independent.

Good split:

- agent A owns `src/pages/PRVault.tsx` and `src/lib/pr-vault.ts`
- agent B owns `src/lib/pr-vault.test.ts`

Bad split:

- two agents both editing `src/App.tsx`
- one agent changing types while another independently changes normalization for the same schema

If multiple agents must touch the same area, the manager should usually keep that work local instead.

If the slices are independent but still affect related behavior, prefer sequencing implementation first and verification second instead of dispatching both in parallel.

### 4. Give a self-contained prompt

Every delegated task should specify:

- the user outcome
- the exact files the agent owns
- the constraints that matter in this repo
- what not to change
- how to verify the slice
- what to report back

If the task touches a known fragile area, explicitly tell the specialist to read the relevant section in `agent_docs/codex.md`.

### 5. Require result shape, not just completion

Ask specialists to return:

- what they changed
- which files they touched
- what verification they ran
- any remaining risk or blocked edge case

If they discover a new recurring repo-specific breakage, the manager should either update `agent_docs/codex.md` directly or ensure that update is included before finishing.

### 6. Integrate deliberately

When specialists finish:

- review their write sets
- check for cross-slice conflicts
- reconcile naming, behavior, and verification expectations
- rerun repo-level checks before claiming success

The manager should not simply concatenate sub-agent outputs.

## Default Specialist Playbooks

The durable role playbooks for these specialists live here:

- [agent_docs/frontend.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/frontend.md)
- [agent_docs/persistence.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/persistence.md)
- [agent_docs/pwa-build.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/pwa-build.md)
- [agent_docs/pr-vault.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/pr-vault.md)
- [agent_docs/docs-process.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/docs-process.md)
- [agent_docs/verification.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/verification.md)

Specialists should read the relevant playbook before implementation, and the manager should update those playbooks when durable role knowledge changes.

### Frontend/UI work

Use a frontend specialist when the task is mainly about:

- screen layout
- card content
- touch affordances
- visual hierarchy
- copy that reflects live state

Repo constraints to include:

- mobile-first
- lightweight client bundle
- avoid unnecessary dependencies
- preserve existing visual language unless the user asked for redesign

### Persistence or schema work

Use a persistence specialist when the task touches:

- `src/types.ts`
- `src/lib/backup.ts`
- plan or exercise storage shape
- import/export behavior
- backward compatibility

Repo constraints to include:

- update normalization with schema changes
- preserve older saved data and backups when possible
- add or update focused tests
- check `agent_docs/codex.md` before changing fragile logic

### PWA/build work

Use a build specialist when the task touches:

- `vite.config.ts`
- manifest behavior
- base-path handling
- `npm audit` remediation
- preview/build flows

Repo constraints to include:

- keep static-host compatibility
- do not undo base-aware manifest handling casually
- prefer intentional dependency changes over forced audit fixes

### Docs/process work

Use a docs specialist for:

- `AGENTS.md`
- `agent_docs/*`
- `todo.md`

Repo constraints to include:

- keep roles distinct
- do not turn standards docs into archives
- keep references accurate
- avoid broad rewrites that erase useful repo-specific guidance

When updating docs/process guidance, decide whether the information belongs in:

- `codex.md` for repo-wide breakage memory
- a role playbook for durable specialist-specific guidance
- `plans.md` for planning standards
- `todo.md` for active task tracking

## Anti-Patterns To Avoid

- Spawning multiple agents that all inspect the same unclear problem.
- Delegating urgent critical-path work and then sitting idle waiting for it.
- Letting two agents edit `src/App.tsx` at the same time.
- Splitting schema changes across agents without one owner for normalization.
- Treating docs work as low-risk when it changes repo process.
- Allowing completed-task history to accumulate in `agent_docs/plans.md`.
- Letting a specialist add a new dependency without explicit justification.
- Running multiple specialists in parallel by default when sequencing would make review and integration safer.
- Letting role playbooks drift into stale, duplicated, or task-history-heavy documents.

## Suggested Task Prompt Template

Use a prompt shaped like this when delegating:

```text
You own <exact files or module boundary>.

User outcome:
<what should be true for the user when this slice is done>

Repo constraints:
- <mobile/static/PWA/persistence constraint>
- <doc or codex rule if relevant>
- Do not edit files outside your ownership unless absolutely necessary

Relevant context:
- <file 1>
- <file 2>
- <known fragile behavior from codex>

Deliverable:
- Implement the slice
- Report files changed
- Report verification run
- Call out remaining risks or blockers
```

## Verification Expectations For The Manager

The manager owns final verification even if specialists ran their own checks.

Minimum bar for most work:

- `npm run lint`
- `npm run build`

Also use `npm run preview` when the change affects:

- installability
- offline behavior
- routing
- local storage or backups
- mobile UI flows that need manual confirmation

If a specialist only ran focused tests, that is not the same as repo-level completion.

## Longer-Term Agent SDK Direction

If this repo later formalizes an Agent SDK-style setup, this file should serve as the operating contract for the manager role.

The likely structure for this codebase is:

- **Manager agent**
  Owns intake, triage, planning, delegation, integration, and final verification.

- **Frontend agent**
  Owns React/UI slices and mobile UX polish.

- **Persistence agent**
  Owns storage, backup, and schema-safe evolution.

- **PWA/build agent**
  Owns Vite, manifest, preview/build flows, and dependency hardening.

- **Docs/process agent**
  Owns agent docs, task hygiene, and durable repo memory.

That future setup should still preserve the same rule: the manager remains accountable for coherence across specialists.

## Quick Start For A Manager Agent

1. Read [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md).
2. Read [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md).
3. Read [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md) if the task touches fragile areas.
4. Check [todo.md](C:/Users/carve/OneDrive/Projects/workout/todo.md) if the task maps to existing tracked work.
5. Create or update a plan using [agent_docs/plans.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/plans.md) for large or risky work.
6. Delegate only where ownership can stay clean.
7. Integrate, verify, and update durable docs before finishing.
