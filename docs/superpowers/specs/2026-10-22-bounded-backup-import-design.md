# Bounded Backup Import And Recoverable Storage

## Outcome

Oversized or excessive backup data is rejected before state replacement.
Accepted imports are persisted as one complete snapshot before the app adopts
them. Storage errors preserve the previous saved data and offer a clear
warning/retry/export path. Normal older backups retain existing normalization.

## Boundaries

One shared limits module owns the policy: 2 MiB UTF-8 JSON/file size; 1,000
exercises and PR records; 100 plans; 100 working sets/log slots per exercise;
520 total plan weeks (including any deload week); 100 scheduled exercise names
per day; 60 PR history entries; 128-character identifiers; 200-character names,
descriptions, and rep labels; 64-character dates. Counts must be safe integers.
Plan currentDay is bounded by durationWeeks * 7 + 1; currentWeek is bounded by
durationWeeks + 1, allowing the completed-plan sentinel and legacy independent
counters. Existing finite weight/reps semantics remain compatible.

Check file.size before reading and raw string size before JSON parsing. Check
collection lengths before traversal. Reject instead of truncating, except
existing backward-compatible defaults and existing stale active-plan repair.
Bound restored drafts and legacy localStorage before rendering as well.

## Storage

Add one versioned canonical localStorage snapshot containing primary state and
unfinished drafts. Preserve the legacy keys as a read-only migration fallback;
once a canonical snapshot exists it is authoritative. Backups retain their
existing version-1 shape and continue excluding drafts.

Read/validate legacy data when the canonical snapshot is absent. Do not delete
the legacy data or write defaults over invalid/unreadable data. Pause automatic
save on a load error and show recovery instructions; explicit successful import
or confirmed wipe can replace the stored snapshot. A normal migration quota
failure must leave legacy data available.

A storage helper serializes and validates the complete bounded snapshot, then
uses a single setItem operation. Import and wipe invoke it before changing UI
state. Failed imports leave both UI state and saved state intact. Routine saves
catch failures, retain current in-memory edits for export, and show a persistent
warning with a retry action. Getter/storage-access failures are also handled.
Confirmed wipe must also remove stale legacy keys after successfully saving the
reset canonical snapshot; cleanup errors must be reported without resurrecting
the legacy values. Normal exports must fit the import byte limit (use compact
JSON or check encoded size) rather than creating a backup the app will reject.

## Scope And Verification

No new runtime dependencies, backend, signing changes, dependency upgrades, or
remote GitHub settings changes. Keep existing sparse logs, units, draft field
sources, and plan lifecycle semantics. Use shared caps for runtime set growth
where necessary to avoid generating invalid persisted counts.

Tests cover max/max+1 limits, excessive counts in small files, oversized raw
JSON before parse, legacy acceptance, completed-plan counters, invalid restored
storage preservation, failed snapshot writes, atomic import, retry, and drafts.
Verify typecheck, full tests, production build, preview with isolated synthetic
storage, and Android rebuild/sync/device checks when a device is available.
The user requested browser/build verification for this run; physical-device
import/relaunch checks remain a documented follow-up.

Recovery protection is independent of displayed errors. Successful retry-load,
import, or explicit overwrite/reset can unlock it; failed operations cannot.
Raw recovery export preserves saved strings without representing fallback data
as the original. Fresh/reset exercise defaults retain their prior distinct
behavior through shared starter constants.
