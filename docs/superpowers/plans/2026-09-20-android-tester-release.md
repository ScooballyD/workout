# Prepare Android Tester Release

This is a living execution plan. Keep `Progress`, `Decision Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective` current as the release workflow is completed.

## Purpose / User Outcome

Megalifts can be distributed to a small Android tester group through Google
Play internal testing using a signed AAB, with instructions that preserve user
data and keep signing material out of the repository.

## Context and Orientation

`android/app/build.gradle` owns native versioning and release signing.
`capacitor.config.ts` fixes the package identity at `com.megalifts.app`.
Capacitor packages the Vite bundle after `npm run build:android:web` and
`npm run sync:android`. OneDrive can make generated Android assets appear as
reparse points, so the native build may need a disposable non-OneDrive copy.

## Progress

- [x] 2026-09-20 America/Chicago: Reviewed current Android project identity, build flow, docs, and official release/testing guidance.
- [x] 2026-09-20 America/Chicago: Added fail-closed local Gradle-property signing support and release documentation.
- [x] 2026-09-20 America/Chicago: Verified the web build and Capacitor sync, confirmed unsigned `bundleRelease` fails with an actionable message, and confirmed debug assembly still succeeds in non-OneDrive staging.
- [x] 2026-09-23 America/Chicago: Configured a user-controlled local upload keystore, built `app-release.aab`, and verified its JAR signature.
- [ ] Create the Play Console internal release and update task tracking.

## Decision Log

- Decision: Use Google Play internal testing and AABs as the primary tester distribution path.
  Rationale: It supports managed tester updates without unknown-source sideloading and is available for up to 100 internal testers.
  Date/Author: 2026-09-20 / Codex
- Decision: Read signing values only from untracked user Gradle properties.
  Rationale: A keystore and passwords must never enter source control or a shared project directory.
  Date/Author: 2026-09-20 / Codex

## Surprises & Discoveries

- OneDrive can expose Capacitor-generated Android assets as reparse points that Gradle refuses to package. A disposable `C:\\` staging copy has built and installed successfully.

## Plan of Work

1. Keep package ID `com.megalifts.app` and maintain increasing Android version codes.
2. Use the guarded Gradle configuration in `android/app/build.gradle`; it must block release tasks without all local signing values.
3. Build the web bundle, sync Capacitor, build `bundleRelease`, and verify the resulting AAB signature.
4. Upload the AAB to Play Console internal testing, configure the tester list and feedback channel, then distribute the opt-in link with the tester instructions.

## Validation and Acceptance

- `npm test`
- `npm run lint`
- `npm run build:android:web`
- `npm run sync:android`
- `android\\gradlew.bat bundleRelease`
- `jarsigner -verify -verbose -certs <AAB path>`
- Confirm the internal Play release has an opt-in link and a tester can install it.

## Idempotence and Recovery

Release builds fail before artifact generation when signing properties are
missing. Retain the keystore outside the repository and retain the last signed
AAB. Roll back through Play by uploading the prior code as a new release with
a higher version code; do not attempt to downgrade an installed app.

## Outcomes & Retrospective

Repository configuration and a verified signed AAB are in place. Play Console
account access is the remaining blocker before the internal release and tester
opt-in link can be created.
