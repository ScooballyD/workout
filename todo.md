### RULES: Tasks should be numbered, include the priority level, and be formatted as an opimized self-contained prompt that can be given to an AI agent. The prompt task should include all relavant context, constraints, and verification guidance. Upon task completion: delete task and add a concise 1 sentence summary to the Completed tasks section

# Current tasks

## Completed tasks
1. [P3] The Settings UNIT toggle now uses the same visual on/off direction as the other default-enabled toggles while still preserving `lbs` as the default unit and leaving conversion behavior unchanged.
2. [P2] Today's workout list now deduplicates repeated scheduled exercise names before resolving exercise records, preserving first-occurrence order while preventing mirrored cards with shared state.
3. [P2] Schedule rename/delete helpers now update any plan entry that still has an `exercises` array, so stale exercise names do not survive on rest-marked days and reappear later.
