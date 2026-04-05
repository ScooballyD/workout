# Execution Plans

Use this file to write and maintain execution plans for large, risky, or handoff-prone work in this repository.

This file defines the standard. It should not become a running archive of finished tasks. Put the active plan in the work artifact the task calls for, and keep this file focused on how plans should be written and maintained.

## When To Use A Plan

Create a plan when the work involves one or more of these:

- multiple files
- persistence or backup changes
- PWA, routing, or build-config changes
- significant refactors
- mobile UX changes with non-trivial verification
- work likely to span multiple iterations or require agent handoff

If the task is small and local, do the work directly instead of creating process overhead.

## Repo Expectations

This repo is a static Vite + React + TypeScript PWA that is meant to work well on phones.

Good plans for this repo account for:

- mobile-first UX
- low client-side overhead
- static-host compatibility
- localStorage and backup compatibility when persisted data changes
- PWA install/offline behavior when routing, assets, or service worker behavior changes

Unless the task explicitly says otherwise, verification should include:

- `npm run lint`
- `npm run build`

Also include `npm run preview` plus a short manual flow when the work affects:

- installability
- offline behavior
- routing
- local-storage or backup flows
- a user-facing mobile interaction that benefits from manual confirmation

## Core Rules

- A plan must be self-contained and not rely on prior chat context.
- A plan must describe the user-visible outcome first, not just code edits.
- A plan must name the exact files, helpers, and commands involved.
- A plan must define acceptance in observable terms.
- A plan must stay current as the work changes.
- A plan must record important decisions and discoveries.
- A plan must include safe retry or recovery guidance for risky work.

## Required Sections

Every plan should include these sections:

### Title

A short action-oriented name.

### Purpose / User Outcome

State what changes for the user and how they can tell it works.

### Context and Orientation

Explain the relevant current system as if the reader has not seen this repo before. Name the important files and how they relate.

### Progress

Use checkboxes with timestamps so another agent can resume work safely.

Example:

- [x] 2026-04-03 10:00 America/Chicago: Reviewed current PR Vault helpers and page state.
- [ ] Implement helper changes.
- [ ] Run verification.

### Decision Log

Record important choices and why they were made.

Example:

- Decision: Keep filter state local to the page.
  Rationale: It is not shared or persisted.
  Date/Author: 2026-04-03 / Codex

### Surprises & Discoveries

Capture unexpected behaviors, constraints, bugs, or evidence found during the work.

### Plan of Work

Describe the intended edits in concrete prose. Name the files and functions or modules to change.

### Validation and Acceptance

List exact commands and the manual checks that prove the work is done.

### Idempotence and Recovery

Explain how to retry safely and what to revert together if the task partially fails.

### Outcomes & Retrospective

Summarize what shipped, what remains, and any follow-up work.

## Quality Bar

A plan in this repo should answer all of these:

- What is changing for the user?
- Which files matter?
- What sequence should the agent follow?
- How will persisted data remain safe?
- How will mobile or PWA behavior be validated if relevant?
- What exact commands prove the work is done?

If those answers are missing, the plan is incomplete.

## Suggested Template

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

## Notes For Agents

- Keep plans concise, but not vague.
- Do not turn a new plan into a changelog before work starts.
- Do not leave stale decisions or stale progress behind.
- If a plan becomes obsolete, replace or remove it instead of letting it drift.
- Keep completed task history out of this file unless the user explicitly asks for an archive here.
