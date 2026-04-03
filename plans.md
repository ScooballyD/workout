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
