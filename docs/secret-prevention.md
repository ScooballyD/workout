# Local Secret Prevention

Root ignore rules protect common local environment files, signing properties,
private-key formats and keystore containers throughout the repository. These
are staging safeguards, not a security boundary or a secret scanner.

## Keep Private Material Outside The Repository

Keep actual signing keys/passwords in approved secret storage and use local
Gradle user properties for release signing. Never add secrets to the tracked
`android/gradle.properties` project settings. Use
`android/release-signing.properties.example` only for placeholders.

Sanitized environment examples may be tracked using the conventional
`.example`, `.sample`, or `.template` suffixes. An exception allows staging;
it does not establish that the content is safe. Review examples for real
credentials before adding them.

## Public Certificates And PEM

PEM can contain a private key or a public certificate, so `.pem` is ignored by
default. Public `.crt`, `.cer`, and `.pub` files are not broadly ignored.
Their content must still be reviewed; an extension is not proof of safety.

If a public PEM is intentionally required, add a narrow repository-relative
exception after the PEM rule, for example:

```gitignore
!/docs/certificates/public-signing-certificate.pem
```

Use the actual reviewed path, not this illustrative path, and never add a
blanket `!*certificate*.pem` exception. No public PEM exception is needed for
the currently tracked inventory.

## Verify Before Staging

Use synthetic paths without creating or opening real secret files:

```powershell
git check-ignore --no-index -v .env.local nested/.env.production nested/upload.jks nested/private.pem
git check-ignore --no-index -v .env.example nested/.env.production.example android/release-signing.properties.example
git status --short
git diff --cached --name-only
```

Verbose output may show a `!` negation for a permitted example. A matching
negation is not an ignored secret. `--no-index` checks pattern behavior even
for tracked paths; normal ignore handling does not apply to tracked files.
See [Git's ignore documentation](https://git-scm.com/docs/gitignore) and
[check-ignore documentation](https://git-scm.com/docs/git-check-ignore).

## Limits And Leak Response

Ignore rules do not protect files already tracked, remove historical exposure,
encrypt local files, prevent `git add -f`, or cover every possible secret name.
They also do not hide sensitive content pasted into logs, screenshots or docs.
Review staging deliberately rather than assuming `git add .` is safe.

If a credential was committed, stop publishing it and arrange revocation or
rotation through the relevant provider. Merely adding an ignore pattern or
deleting the latest copy does not invalidate the credential or remove it from
history. History cleanup requires a separate coordinated decision; do not
change the published Android signing identity casually.

## Verification Record

On 2026-10-23, 109 independent synthetic path assertions passed for root,
nested, and nested Android paths, including uppercase key/container extensions,
environment examples, signing examples, and public certificate formats. Verbose
`check-ignore --no-index -v` confirmed the matching rules and negations.
The tracked filename inventory found no matching private-key/container or
environment-secret filenames; the known signing example contains placeholders.
The task diff contains only ignore patterns and documentation, not key material.
No secret files were created, opened, removed, rotated, committed, or pushed.
