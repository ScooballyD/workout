# Android Backup And Persistence Verification

## Scope And Isolation

Task 2 verifies bounded backup imports and atomic persistence on physical
Android. Device: Samsung Galaxy S24 (`SM-S921U1`), Android 16. The installed
`com.megalifts.app` tester build is non-debug and was not updated or cleared.

Tests use a temporary debug package,
`com.megalifts.app.verification20261023`, with separate app storage. Its
application ID was overridden only through an ignored Gradle init script;
production source/package identity and signing configuration remain unchanged.
The APK metadata was checked before installation to prevent accidental
replacement. No real workout data is used for imports or failure injection.

## Preparation

- Fresh web build passed.
- Capacitor sync passed.
- Isolated debug packaging passed.
- Side-by-side install and launch succeeded.
- Initial WebView automation connection timed out while the phone was locked;
  connection succeeded after unlock. Tests ran against the packaged
  `https://localhost/` Android WebView, not a desktop browser or dev server.

## Test Results

- Passed: valid older version-1 backup imported and saved as a canonical snapshot.
- Passed: malformed JSON, 2 MiB + 1 byte file, and excessive set-count JSON rejected without changing prior saved data or displayed plan.
- Passed: oversized file rejected before FileReader; normal invalid inputs exercised the actual packaged input handler.
- Passed: injected quota failure preserved the old snapshot and pending in-memory setting; Retry save persisted the pending setting.
- Passed: failed import retained both persisted and displayed plan state.
- Passed: invalid canonical data entered recovery; a failed import plus ordinary edits did not unlock autosave or overwrite the original.
- Passed: raw recovery export contained the exact malformed saved text; current-data export contained only current fallback/session data.
- Passed: Retry loading recovered the valid original snapshot after a transient injected storage-read denial.
- Passed: unlogged weight `123.25` and reps `7`, plus the imported plan, survived Android `am force-stop`, a fresh process launch, and reopening exercise detail.
- Passed: a uniquely named synthetic backup was pushed to Downloads and selected through the real Android document picker; the app persisted its distinct `NATIVE PICKER CHECK` plan.
- No WebView page errors were reported by either automated suite.

The installed tester app remained version code 1 / version 1.0 with its original
2026-09-24 update timestamp. No real workout data was read or replaced.

## Coverage Limits

Synthetic fault injection was limited to the isolated debug app. Invalid-file
tests used Playwright file-input injection; the valid-file native picker was
tested separately. Export content and recovery buttons were verified by
capturing generated Blobs inside the WebView, not by verifying exported file
placement in Android Downloads or a native share flow. Quota/read denial were
injected exceptions, not actual storage exhaustion or OS policy changes.

A debug package does not prove Play signing, production-only behavior, Android
OS backup policy, or other Android versions/OEMs. Native export delivery remains
unverified; no claim is made that an Android download/share integration was
added or fixed by this task.

## Cleanup

The isolated package and the two uniquely named synthetic device files were
removed successfully after testing. The local CDP forward was closed. Normal
debug output was rebuilt without the temporary ID override; verify the metadata
before any later install. No original app, other profile, or unrelated download
was removed or cleared.
