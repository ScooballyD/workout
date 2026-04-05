### RULES: Tasks should be numbered, include the priority level, and be formatted as an opimized self-contained prompt that can be given to an AI agent. The prompt task should include all relavant context, constraints, and verification guidance. Upon task completion: delete task and add a concise 1 sentence summary to the Completed tasks section

# Current tasks

None currently queued.

## Completed tasks
1. [P3] The create-plan summary line now derives a deterministic muscle-focus label from the scheduled exercises' primary muscle groups and falls back gracefully when the plan is still sparse.
2. [P2] Exercise set counts now default to `2`, persist per plan via `exerciseSetCounts`, and no longer cross-contaminate progression across plans.
3. [P2] PR Vault filters now derive muscle-group chips from the exercise catalog, preserve `ALL` and multi-select behavior, and fall back to `Other` for missing or legacy tag data.
4. [P3] Grind cards now show the next set's weight and reps together, while fully completed exercises display `-` instead of a misleading fallback target.
