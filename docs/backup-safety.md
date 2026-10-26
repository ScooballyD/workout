# Backup Safety And Recovery

Megalifts checks backup size and structure before adopting imported data.
Invalid or excessive values are rejected rather than silently truncated.
The same domain limits apply when loading saved data.

## Limits

| Data | Maximum |
| --- | --- |
| Backup JSON/file size | 2 MiB, measured in UTF-8 bytes |
| Exercises | 1,000 |
| PR records | 1,000 |
| Saved plans | 100 |
| Working sets per exercise | 100 |
| Current/previous log slots per exercise | 100 |
| Total plan duration, including deload | 520 weeks |
| Scheduled exercise names per day | 100 |
| Plan-local exercise set-count entries | 1,000 |
| History entries per PR | 60 |
| Identifiers | 128 UTF-16 code units |
| Names, schedule descriptions, rep labels | 200 UTF-16 code units |
| Date strings | 64 UTF-16 code units |

The policy is defined in `src/lib/data-limits.ts`. Counts must be safe integers
within their domain. A completed plan may retain its first day after the plan
ends (`durationWeeks * 7 + 1`) and its completed-week sentinel
(`durationWeeks + 1`). Ordinary older version-1 backups still receive existing
defaults for fields added later, such as muscle group and rest-day preference.

## Import And Save Failures

Oversized files are rejected before reading. The actual text size and all
bounded fields are checked before saving or replacing current data. A valid
import must also fit the available browser/Android storage quota.

An import is saved as a complete snapshot before the UI adopts it. A failed
write leaves the previous saved snapshot and current workout data intact.
Routine save failures keep pending edits in memory and show a warning with
retry/export controls. Export pending changes before closing the app if saving
is unavailable; unsaved changes cannot survive a process restart.

If saved data cannot be read or fails validation, automatic saving is paused
to avoid overwriting the original with defaults. Recover using a valid backup
or an explicit reset after preserving any data you need. A fallback screen is
not confirmation that the original saved data has been deleted.

Recovery remains locked even if another operation fails. Use **Retry loading
saved data** after a temporary storage-access problem. **Export raw saved
data** preserves the original storage strings in a recovery envelope; it is
not a normal importable workout backup. **Export current data** instead exports
only the fallback/session data shown on screen, not the unreadable original.
Overwriting saved data is an explicit destructive recovery action.

## Compatibility And Privacy

The canonical storage snapshot includes unfinished workout drafts. JSON
backups retain their version-1 format and exclude those drafts, as before.
Legacy per-field storage is read only when a canonical snapshot is absent.
Migration does not discard the legacy values before a new snapshot is saved.

JSON exports are unencrypted files containing workout data. Store and share
them accordingly. These safeguards do not change Android's OS-level backup
policy or create cloud synchronization.

## Verification

On 2026-10-23, 147 automated tests, TypeScript checks, the production build,
Capacitor sync, and Android `assembleDebug` passed. Isolated mobile-browser
checks covered valid/invalid/oversized imports, failed writes without partial
replacement, retry and reload, recovery locking, raw/normal exports, transient
read-denial recovery, and unlogged draft persistence. Physical Android checks
then passed on a Samsung Galaxy S24 running Android 16 using an isolated test
package, including the native import picker and unlogged draft force-stop/
relaunch. Export Blob content was checked, but native exported-file delivery
was not verified. See [device verification](android-backup-verification-2026-10-23.md)
for isolation, results, and limitations.
