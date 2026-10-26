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
- GitHub main is protected by the active `Main PR and CI protection` ruleset. Required CI context is `validate` from GitHub Actions App 15368; coordinate ruleset changes before renaming that job. See `docs/github/main-protection.md` for policy and verification limits.
- Root ignore rules cover local signing/key formats across the repo; keep release credentials in user-local Gradle properties, not tracked `android/gradle.properties`. PEM is default-ignored; any intentional public PEM needs a reviewed exact-path exception. See `docs/secret-prevention.md`.
- Base-path correctness matters for subpath deployments; manifest `start_url`, `scope`, and icon URLs should remain base-aware.
- Preview/build verification is mandatory for changes that touch PWA behavior.
- The repo now also has a Capacitor Android wrapper that packages the built web assets from `dist` into the native Android project.
- For Android tester builds, web changes are not enough by themselves; the required follow-up path is `npm run build:android:web` and `npm run sync:android` before creating a new Android build.
- Changes that affect routing, startup, service worker registration, or persistence should be sanity-checked with the Capacitor asset-sync flow because Android packaging consumes the built bundle, not the dev server.
- If Gradle reports that synchronized Capacitor assets are not regular files in a OneDrive checkout, build from a disposable non-OneDrive staging copy instead of changing generated assets or tracking them in Git. See `agent_docs/codex.md` for the safe sequence.

## Anti-Patterns

- Treating a sandbox `spawn EPERM` as proof that the repo itself is broken.
- Making forced dependency changes only to satisfy `npm audit` without understanding build impact.
- Breaking manifest relative paths or subpath installability.
- Assuming Android tester builds update from server deploys alone after Capacitor was introduced.

## Verification Expectations

- Run `npm run lint`
- Run `npm run build`
- Run `npm run sync:android` when the work affects packaged Android assets or the Capacitor wrapper flow
- Run `npm run preview` when installability, routing, manifest, or service worker behavior changes
- Inspect generated output when the task touches manifest or build-time assets
- For Android routing changes, install the debug build on a physical device and verify exercise-detail system back, toolbar back, bottom-navigation history, repeated back presses, root-only exit, relaunch, and process Logcat.
