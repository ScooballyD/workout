# Security Audit: 2026-10-22

## Assessment

No credential leak was detected in the scanned Git history, current project
files, public PR discussions, web build, or expanded Android release bundle.
The repository is **not ready for a clean security assessment**: three npm
packages have published advisories, public `main` is unprotected, and import
resource limits and Android backup policy need attention.

This is a dated source/configuration and dependency audit, not a penetration
test or a guarantee that all vulnerabilities are absent. Application behavior
and repository settings were not changed during this audit.

## Scope And Evidence

- Repository: `ScooballyD/workout`, public.
- Local reviewed commit: `4b3f772f8162cd67d4b52ac84760ad04d9ee3fe2` (`p1`).
- Refreshed public main: `9c61ebfedc3dca74bc195177c9df9253df9c36f0`; its tree matches the reviewed commit.
- 52 reachable commits across fetched refs and local reflogs; Gitleaks scanned 44 commits with patches, including old branches, and approximately 991 KB of diff content.
- Supplemental inspection scanned all 318 unique reachable file blobs for private-key markers, common provider tokens, and non-placeholder credential assignments.
- 137 tracked files at the reviewed commit; current snapshot also included untracked smoke-test images and selected ignored build/preview logs and a local test backup.
- Gitleaks v8.30.1 downloaded from its official release; archive SHA-256 verified against the published checksum. Output was fully redacted.
- Scanned public issue/PR descriptions, issue comments, PR inline comments, review submissions for PRs 1-4, and commit messages. No GitHub releases were returned by the releases API.
- Scanned `dist`, Android output files, and extracted contents of the existing signed AAB dated September 23. No keystore or local signing-property file was present in that archive.
- AAB SHA-256: `B09FACFA6222FFCD222C34E7668F8D8FF5944FD80D951E06A54FC94C5A11933C`.
- Reviewed source input/storage/rendering paths, PWA configuration, Android manifest, native activity/provider, signing config, installed Capacitor navigation defaults, and GitHub Actions workflow.
- Queried the current npm advisory database against both installed dependencies and the lockfile. Queried OSV for 50 resolved Maven release dependency coordinates; zero matches returned. The local Capacitor project is assessed separately through npm advisories.
- Gradle wrapper JAR matches the official Gradle 8.14.3 checksum. All 564 resolved package URLs in the npm lockfile use `registry.npmjs.org` and have integrity values.

## Findings Requiring Remediation

### 1. Critical Advisory: Capacitor Android 8.3.0

Location: `package-lock.json:1591`; declared in `package.json:20`.

The locked native runtime is affected by
[GHSA-rvm3-566m-v7fv](https://github.com/advisories/GHSA-rvm3-566m-v7fv).
Remote content loaded through the internal HTTP proxy document path can run
with the app origin and access local storage and registered native plugins.
Disabling CapacitorHttp alone does not fix affected versions.

The advisory requires activation of an attacker-controlled link inside the
WebView. This audit found no current user-controlled hyperlink or raw HTML
rendering path in Megalifts, so it does **not** establish a working exploit
against the current app. The dependency is nevertheless affected and should
be replaced before further releases.

Upgrade to a currently patched supported Capacitor 8 version, align core/CLI
and Android versions, sync, rebuild, and distribute the corrected native
artifact. The advisory lists patched 8.4.3 and 8.5.1 release lines; recheck the
advisory when choosing the upgrade. Updating the repository alone does not
patch the installed tester build.

### 2. High Advisory: Vite 6.4.3 Development Tooling

Location: `package-lock.json:7057`.

The Vite version contains multiple published advisories, including Windows
editor-launch command injection and an existence-check bypass:
[GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
[GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), and
[GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw).
Other reported Vite advisories concern middleware script execution and
development-server file serving.

These concern a running development server/editor workflow. Vite's server is
not embedded in the static production app or Android bundle. Upgrade to a
patched release, such as the fixed 6.4.4 line or a compatible supported newer
line, and verify the actual new lockfile with npm audit.

### 3. Medium Project Risk: Backup Import Has No Resource Limits

Locations: `src/App.tsx:1464`, `src/App.tsx:1665`, `src/App.tsx:2113`,
`src/lib/backup.ts:41`, `src/lib/backup.ts:244`,
`src/lib/backup.ts:289`, `src/lib/exercise-log-inputs.ts:46`.

The file reader reads an entire selected file without a byte-size check.
Backup validation accepts positive integer set counts and plan durations
without a safe upper bound, and does not cap collection/history/string sizes.
Those counts later determine synchronous array creation and rendering;
accepted state is also persisted with uncaught localStorage writes.

A user who imports an excessively large or specially constructed backup can
freeze rendering, exceed the storage quota, or persist counts that continue
causing failure after relaunch. Exploitation requires the user to select a
file; this is a local availability/data-integrity issue, not an unauthenticated
network endpoint. No destructive or resource-exhaustion test was run against
user data.

Reject oversized files before reading, validate safe bounded domain counts
and collection lengths before replacing state, and handle storage failures
with a recoverable user message. Apply the same bounds to restored storage.

### 4. Medium Integrity Gap: Public Main Has No Branch Protection

GitHub's public branch API reported `protected: false` for `main`, with required
status checks disabled. A collaborator or compromised account with write
access can bypass the PR checks by pushing directly or rewriting that branch.
This is a repository integrity gap, not evidence of an intrusion.

Require a PR and passing CI on main, prevent force pushes/deletion, and review
whether administrators may bypass those requirements. Remote settings were
not changed by this audit.

### 5. High Advisory, Build-Time Exposure: source-map-js 1.2.1

Location: `package-lock.json:6383`.

[GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
describes synchronous denial of service while consuming hostile indexed
source maps. This dependency is reached through the build/CSS toolchain;
no runtime user source-map ingestion path was found in Megalifts. Update the
lockfile to patched 1.2.2 or later and re-run the audit/build.

### 6. Privacy Policy Gap: Android Automatic Backup Is Enabled

Locations: `android/app/src/main/AndroidManifest.xml:5`, `README.md:20`.

The source and effective release manifests enable `android:allowBackup` and
define no explicit cloud-backup or device-transfer exclusions. The README
describes data as device-local with no automatic remote backup. Android can
automatically back up eligible app data when platform/user conditions permit.
Actual transferred data was not observed in this audit.

Choose and document the intended policy. If strict device-only storage is
required, configure both older-platform backup rules and Android 12+ data
extraction rules as appropriate. If OS backup is intended, document it and
review the Play privacy disclosures. This setting alone does not grant other
apps unrestricted access to workout data. See
[Android Auto Backup documentation](https://developer.android.com/identity/data/autobackup).

## Prevention And Privacy Improvements

- `.gitignore:4` excludes only `.env`. Tests with `git check-ignore` show that `.env.local` and `.env.production` are not excluded. Keystore exclusions in `android/.gitignore:57` do not protect root-level keystores, and `.p12`, `.pfx`, and `.pem` lack explicit protection. Extend the root patterns while keeping sanitized examples trackable. No actual private keys were detected.
- `.github/workflows/ci.yml` performs install/typecheck/build but no tests, dependency audit, or secret scan. It uses version-tagged Actions and leaves token permissions/persisted checkout credentials at defaults. Add explicit read-only token permissions, disable persisted checkout credentials where unnecessary, pin Actions to verified commits, and add ongoing scans. No workflow expression injection, `pull_request_target`, external script execution with secrets, or deliberate secret exposure was found.
- Public docs contain absolute Windows user-directory links. Git author metadata also includes the author's name and personal email. These are publicly visible personal metadata, not credentials; decide which identity to retain and use repository-relative documentation links for portability. Changing current docs will not remove earlier metadata from history.
- The signing certificate in a distributable Android package is public by design and may carry the identity fields entered during key creation. A public certificate does not contain the private key. User-home keystores/passwords were not opened, and the previous setup password exposure in this chat was not reprinted. This scan cannot prove that an old password was rotated; preserve the now-published signing identity and use Play's supported key procedures if any key compromise is suspected.
- `android/app/src/main/res/xml/file_paths.xml:3` exposes broad configured external/cache roots through a non-exported FileProvider. No app path was found that grants arbitrary incoming paths to other apps. Narrow these roots to the actual sharing use case before adding native sharing features.
- Workouts and JSON backups have no application-level encryption. They rely on browser/Android storage isolation and device protection; exported JSON needs to be handled as private user data. This alone is not an exposed server database.
- `src/index.css:1` loads Google Fonts. Those requests disclose network metadata to the font provider, although no code transmitting workout records to that provider was found. Consider bundling fonts and documenting third-party requests.
- `index.html` defines no Content Security Policy; actual web-server response headers were not available. A restrictive tested CSP is useful defense in depth, but its absence alone does not prove XSS.

## Checks That Passed

- Gitleaks history, current snapshot, commit messages, public discussion, `dist`, and extracted AAB scans: zero findings.
- Supplemental reachable-blob scan: zero suspicious credential assignments or private-key markers; zero historical sensitive keystore/environment filenames.
- Application source search/review: no `dangerouslySetInnerHTML`, raw HTML assignment, `eval`, or application-controlled arbitrary script execution found. User text is rendered through React text nodes. No user-controlled external hyperlink path was identified.
- No backend credentials, account/authentication server, or remote workout API exists in the reviewed app. Backups pass structured validation instead of directly replacing state from unchecked JSON.
- Native configuration has no development server URL, navigation wildcard, cleartext override, custom exported intent handler, or forced release WebView debugging setting. Capacitor defaults debugging to the app's debug status. The FileProvider is non-exported.
- npm lockfile integrity fields and official Gradle wrapper checksum verified.
- Resolved Maven advisory lookup: zero matches across 50 coordinates.
- `npm test`: 107 passed. `npm run lint`: passed. These confirm baseline functionality, not absence of security flaws.
- `:app:lintRelease`: passed with 15 non-blocking tooling/resource/manifest-order warnings.

## Verification Limits

- GitHub CLI could access public data but authenticated secret-scanning/Dependabot/settings APIs returned HTTP 401. Alert counts, push protection, default workflow permissions, and private logs/artifacts could not be verified. No unavailable count is treated as zero.
- No Play Console security configuration, installed-device backup behavior, remote hosting headers, external services, or dynamic exploit test was assessed.
- Reachable Git refs/reflogs were covered. A full unreachable-object integrity scan did not finish and was stopped; orphaned/dangling local objects, deleted GitHub forks/caches, local browser-profile databases, arbitrary encoded image data, and unrelated home-directory credentials were not exhaustively inspected.
- An attempted independent specialist source review was stopped by an automated safety flag before delivering findings. Source review in this report was completed by the manager; it is not a second independent assessment.
- Advisory databases and pattern scanners can miss unknown vulnerabilities and unusual credential formats. npm and OSV findings are a snapshot of the audit date.

## Recommended Order

1. Patch Capacitor, Vite, and source-map-js, then repeat audits and rebuild/test the native release.
2. Add backup resource bounds and decide the OS backup/privacy policy.
3. Enable main protection and recurring dependency/secret checks; improve ignore coverage.
4. Clean personal path metadata and finish remaining hardening before advertising the repository as security-reviewed.

Only this report and its audit plan were added. No runtime fixes, credential
rotation, Git history rewrite, commit, push, or remote-setting change was made.
