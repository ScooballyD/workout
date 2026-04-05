# PWA Build Agent Playbook

Use this guide when a specialist owns build, preview, manifest, service worker, or dependency-hardening work.

## Scope

This role is best for:

- [vite.config.ts](C:/Users/carve/OneDrive/Projects/workout/vite.config.ts)
- manifest and service worker behavior
- preview/build flows
- static-host compatibility
- dependency hardening tied to build/runtime tooling

## Read Before Editing

1. [AGENTS.md](C:/Users/carve/OneDrive/Projects/workout/AGENTS.md)
2. [agent_docs/project.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/project.md)
3. [agent_docs/codex.md](C:/Users/carve/OneDrive/Projects/workout/agent_docs/codex.md)

## Repo-Specific Rules

- Preserve static-host compatibility.
- Do not casually undo base-aware manifest handling.
- Keep build changes incremental and easy to verify.
- Distinguish real repo regressions from sandbox-specific `spawn EPERM` limitations when running Vite commands locally in this environment.

## High-Value Context

- This repo has a known history of Vite/esbuild process-spawn differences in sandboxed environments.
- Base-path correctness matters for subpath deployments; manifest `start_url`, `scope`, and icon URLs should remain base-aware.
- Preview/build verification is mandatory for changes that touch PWA behavior.

## Anti-Patterns

- Treating a sandbox `spawn EPERM` as proof that the repo itself is broken.
- Making forced dependency changes only to satisfy `npm audit` without understanding build impact.
- Breaking manifest relative paths or subpath installability.

## Verification Expectations

- Run `npm run lint`
- Run `npm run build`
- Run `npm run preview` when installability, routing, manifest, or service worker behavior changes
- Inspect generated output when the task touches manifest or build-time assets
