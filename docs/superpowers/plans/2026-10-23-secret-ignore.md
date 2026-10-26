# Secret Ignore Coverage Plan

## Purpose / User Outcome

Prevent accidental staging of local environment credentials, signing settings,
and private-key containers throughout the repository, without hiding sanitized
examples or intentional public certificates.

## Context And Orientation

Todo task 5 follows the 2026-10-22 audit. Root `.gitignore` covers only `.env`;
Android-only patterns cover `.jks`, `.keystore`, and `release-signing.properties`.
The tracked candidate inventory contains only `android/gradle.properties` and
the sanitized `android/release-signing.properties.example`, not private keys.
Other uncommitted application/docs changes must remain untouched.

## Progress

- [x] 2026-10-23 America/Chicago: Reviewed rules, signing example and tracked candidate filenames.
- [x] Specialist added root-recursive rules and verified previously trackable secret paths became ignored.
- [x] Manager's expanded matrix caught omitted key.properties/keystore.properties names; specialist fixed them, then all 109 independent assertions passed.
- [x] Manager verified matching rules/negations, tracked inventory, documentation and diff; task completed without runtime changes.

## Decision Log

- Ignore environment variants and common local signing/key formats by filename.
- Keep sanitized example/sample/template configuration files trackable.
- Default-deny PEM because it can contain private material. Permit future public PEM only with a reviewed exact-path exception; do not broadly trust certificate-like names.
- Preserve public `.crt`, `.cer`, and `.pub` formats and ordinary Gradle project settings.
- No secret content reads, local-file deletion, key rotation, history rewrite, commit or push.
- Quick-implementer model GPT-5.6 Luna is unavailable; use available GPT-5.6 Sol / low for the bounded mechanical edit.

## Plan Of Work

1. Specialist owns `.gitignore` and, only if needed, `android/.gitignore`.
2. Manager owns `docs/secret-prevention.md`, task status, and durable role guidance.
3. Verify with synthetic filenames using `git check-ignore --no-index -v`, including nested Android paths and example exceptions. Inspect tracked inventory and final diff for accidental private material without printing secret values.

## Validation And Acceptance

All representative secret filenames must be ignored at root and nested levels.
Known sanitized examples and public certificate formats must remain trackable.
No runtime code is changed, so app checks are not rerun for this ignore/docs task.

## Idempotence And Recovery

Ignore patterns affect untracked paths, not existing tracked secrets or history.
Review exact-path exceptions before staging public PEM. If a real leak is found,
stop, revoke/rotate affected credentials through a separate authorized process,
and assess historical exposure; do not treat ignore rules as remediation.

## Surprises & Discoveries

None beyond the audit's root-versus-Android coverage gap.

## Outcomes & Retrospective

Root rules now cover environment variants, local signing properties, private
keys, keystores/PKCS containers and common SSH private filenames, including
uppercase variants. Sanitized examples, public certificate formats and ordinary
Gradle settings remain trackable. PEM remains default-ignored with documented
exact-path exceptions for reviewed public files. Android-specific rules remain
unchanged because root coverage is inherited.

Verification: 109 manager path assertions passed, specialist's additional
matrix passed, tracked sensitive-filename inventory found no actual matching
secret files, and `git diff --check` passed. Reviewed task changes contain no
key material. Runtime tests/build were not rerun for this metadata/docs-only
change. No commit/push, key deletion/rotation or history rewrite was performed.
