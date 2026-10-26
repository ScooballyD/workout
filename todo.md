### RULES: Tasks should be numbered, include the priority level, and be formatted as an opimized self-contained prompt that can be given to an AI agent. The prompt task should include all relavant context, constraints, and verification guidance. Upon task completion: delete task and add a concise 1 sentence summary to the Completed tasks section

# Current tasks

## Completed tasks
1. [P1] Megalifts now has the base Capacitor Android wrapper in place, including Capacitor dependencies, `capacitor.config.ts`, and a generated `android/` project synced from the current `dist` build.
2. [P1] The repo now has repeatable Capacitor Android packaging scripts and repo-specific docs covering the required rebuild-and-sync workflow before Android tester releases.
3. [P2] The manager playbook now assigns specialist models by role and risk, requires documented fallbacks for unavailable models, preserves sequential safety, and reserves final approval and publishing authority for the manager and user.
4. [P1] Android system back now follows Megalifts route history on nested screens and exits only from the root route, with toolbar and browser navigation preserved.
5. [P1] Unlogged workout drafts now persist separately across detail navigation and Android relaunches, resolve source-aware values on Grind, convert with units, clear through lifecycle boundaries, and were verified on device through logging and workout completion.
6. [P2] The empty Training Plans screen now explicitly fills the available mobile width while preserving the populated layout's existing cap, margins, and spacing.
7. [P2] Rest-day handling is now a default-off persisted setting that automatically skips scheduled rest entries after workouts and when disabled on an active rest day, while retaining the optional explicit rest-day flow.
8. [P1] The physical Android smoke test passed on a connected device, including the corrected PR Vault filter initialization, draft and back behavior, rest-day settings, offline relaunch, packaged build installation, and clean scoped Logcat; OneDrive packaging now has a documented non-synced staging workaround.
9. [P1] Backup import/restore now enforces shared byte and structural limits, commits complete snapshots atomically, and exposes recoverable storage failures; 147 tests, browser recovery/draft checks, web checks, Android sync and debug build passed, with physical-device coverage tracked separately.
10. [P1] GitHub main now has an API-verified active ruleset requiring PRs, up-to-date successful GitHub Actions validation and resolved conversations, blocking force pushes/deletion with no bypass actors while retaining zero required approvals for the sole maintainer; the next ordinary PR will confirm a live merge under this policy.
11. [P2] Bounded backup validation, failed-write recovery, raw/current export content, native import picker, and draft force-stop/relaunch passed on an isolated Galaxy S24 Android 16 package without replacing tester data; native export-file delivery remains unverified.
