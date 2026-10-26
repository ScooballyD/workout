# 3. Building, Testing, Android, And Explaining Your Work

This chapter connects the code to the development process. It also separates
what the product does from what you personally did while directing AI agents.

## 3.1 The Toolchain In Python Terms

| Project item | Approximate Python-world comparison | Actual responsibility here |
| --- | --- | --- |
| `package.json` | parts of `pyproject.toml` plus task commands | Scripts, direct dependencies, metadata |
| `package-lock.json` | a resolved dependency lockfile | Exact resolved package graph and integrity metadata |
| `node_modules/` | an installed environment's packages | Local dependencies; not source to commit |
| TypeScript compiler | a static type checker, plus compilation capabilities | This repo invokes it with no output generation |
| Vite | development server and production bundler | Transforms source and builds browser assets |
| `dist/` | generated distribution output | The static app deployed/packaged for users |
| Node test runner | broadly like a lightweight `unittest` runner | Executes helper tests |
| Gradle | native build orchestration | Builds Android resources, code and packages |

These are comparisons, not exact equivalences. A Python wheel is not the
same format or delivery model as a Vite browser bundle.

`package.json` uses `"type": "module"`, so source uses JavaScript's ES module
`import`/`export` system. Imports such as `import type { Exercise } ...` are
type-only dependencies that do not need to exist at runtime. Other imports
load actual runtime values or functions.

The package's `private: true` prevents accidental npm publication of the
package. It does **not** make the GitHub repository private, encrypt source,
or hide files from a Git push.

## 3.2 What Each Command Proves

Actual scripts are in [package.json](../package.json).

| Command | What it does | What it does not establish |
| --- | --- | --- |
| `npm install` | Installs/resolves dependencies using package metadata and lockfile rules | May change the lockfile; not a security review |
| `npm ci` | Reproducible lockfile-based install for CI | Does not run application tests by itself |
| `npm run dev` | Starts Vite's development server | Does not produce the deployed Android package |
| `npm test` | Runs the configured `.test.ts` files using Node | Not a full React UI or native-device test suite |
| `npm run lint` | Runs `tsc --noEmit` | Despite its name, not ESLint or a full style/accessibility audit |
| `npm run build` | Builds production web assets | Does not automatically run `npm run lint` or native tests |
| `npm run preview` | Serves the existing production build locally | Does not rebuild stale output |
| `npm run sync:android` | Copies built assets and updates Capacitor integration | Does not publish to Google Play |
| `npm run open:android` | Opens the Android project in Android Studio | Does not guarantee a successful build or install |

The test command uses Node's type-stripping/test flags. The verified local
runtime on this workstation was Node 24.14.1 when this guide was written.
Do not assume any old Node version can run that script. The current CI uses
Node 20 for installation, typechecking and building, but does **not** run the
test command. Adding tests to CI should include checking runtime compatibility.

When explaining a verification result, name the command and its scope.
"The production bundle builds" is precise. "Everything is tested" is not.

## 3.3 Follow The Build From Source To Device

```text
index.html + src/main.tsx
          |
          v
     Vite + plugins
          |
          v
   dist: HTML, JS, CSS, icons, manifest, service worker
          |
          +--> static website / installable PWA
          |
          +--> Capacitor sync --> Android assets --> Gradle --> APK / AAB
```

[vite.config.ts](../vite.config.ts) configures the React transformation,
Tailwind processing, PWA generation and a custom manifest-base plugin.
The config is build tooling; it is not a runtime React component.

Production JavaScript bundles can be split. App uses `React.lazy` for PR
Vault, with `Suspense` providing a fallback while that code loads. The goal
is to avoid making the first screen pay the entire charting-code cost.
Lazy loading does not mean the data lives on a server or that the feature
must be online forever; PWA caching and packaged assets are separate layers.

The custom manifest plugin corrects `start_url`, `scope` and icon URLs to the
configured build base. If a site is hosted below `/some/path/`, a hardcoded
root URL could launch or request icons from the wrong location. This fix is
specific to manifest URLs; it does not automatically solve every router or
web-server deep-link configuration issue.

## 3.4 What Offline Support Actually Means

A PWA is a web application with install-related metadata and capabilities
such as a service worker. A service worker is a browser-managed script that
can intercept requests and cache responses independently of a visible page.

In this project, `vite-plugin-pwa` generates the service worker and manifest;
`registerSW({ immediate: true })` starts registration from the entry point.
The Workbox configuration precaches generated app assets and cleans up old
caches. It is not a cloud synchronization engine for workout records.

Separate three things:

- **Cached app shell:** JavaScript, CSS, HTML and related built assets.
- **Workout data:** the versioned localStorage snapshot inside a device/profile.
- **Downloaded backup file:** a user-controlled JSON copy outside that storage.

Deleting a cache, clearing site data, uninstalling the Android app and wiping
workout data are not interchangeable operations. They can have different
effects on those three categories.

Some styling assets, such as the Google Fonts import in `src/index.css`,
still involve external requests. "Works offline" should be qualified by
which features/assets have actually been cached or packaged and tested.
Do not claim the app never makes network requests.

The web router uses `BrowserRouter`. Refreshing `/plans` at a static host
requires the host to return the app HTML for that route. Otherwise the host
may look for a physical `/plans` file and return 404 before React can run.
The packaged Android runtime serves its own bundled assets; a developer's
local preview server is not required on the user's phone.

## 3.5 Capacitor Is A Wrapper, Not A Rewrite Into Native UI

[capacitor.config.ts](../capacitor.config.ts) declares:

```ts
const config: CapacitorConfig = {
  appId: 'com.megalifts.app',
  appName: 'Megalifts',
  webDir: 'dist'
};
```

`appId` identifies the application, `appName` is its name, and `webDir` tells
Capacitor where the already-built web output is located. The native Android
project contains the host activity and build configuration. The UI and
business rules are still largely shared TypeScript/React code.

Distinguish this from React Native. React in a WebView is not equivalent
to rendering React Native components. It is also not a Python application
running behind a phone-shaped browser interface.

After source changes, the required chain is:

```powershell
npm test
npm run lint
npm run build:android:web
npm run sync:android
# Then create the intended native artifact through Gradle/Android Studio.
```

If you only build the web output, installed Android users still have their
old package. If you sync stale `dist`, the native package can still contain
old behavior. This is a common explanation for "the fix works in the browser
but the phone still behaves the old way."

## 3.6 Android Back Navigation As A Small Design Case

[android-back.ts](../src/lib/android-back.ts) contains a pure policy:

```ts
if (pathname === '/') {
  return 'exit-app';
}
return canGoBack ? 'history-back' : 'navigate-root';
```

At the root, exit. On a nested route, go back if possible; otherwise navigate
to the root. App's `AndroidBackHandler` connects that policy to Capacitor's
native back event and React Router navigation.

The helper is easy to unit-test because it has no phone dependency. The
listener lifecycle is not fully proved by testing that helper. Registration
and removal are asynchronous; App uses refs and serialized operations to
avoid leaving competing listeners during lifecycle transitions. It also
keeps current route/navigation values available to the listener.

This illustrates a useful separation: **policy** can be tested as a function;
**integration** still needs an environment that supplies actual native events.
Explain both rather than treating a small green helper test as complete
Android verification.

## 3.7 APK, AAB, Signing And Tester Distribution

An APK is an installable Android package. An AAB is a publishing bundle used
by Google Play to generate device-appropriate APKs. You do not generally
install an AAB directly the way you install an APK.

The package/application ID is the durable identity for updates. Signing is
another essential part of update trust. A debug artifact and a Play-distributed
artifact may not be signed by the same key, so replacing a Play app with a
debug APK can fail or tempt someone into uninstalling it and losing data.
Do not solve that by casually deleting the installed app.

Release signing properties are supplied locally, not committed. A public
signing certificate is not the private key. A keystore and its credentials
are sensitive; the release guide uses placeholders rather than real values.

Read [Android tester release](../docs/android-tester-release.md) for the
repository's commands. Do not memorize passwords or embed them in interview
notes. Future releases need deliberate version-code management and actual
distribution; this guide does not upload anything to Play.

The physical backup tests used a separate temporary package so destructive
synthetic imports never touched the installed tester app. The normal package
identity was not changed in source. That is a testing isolation technique,
not a proposal to rename the shipped application.

## 3.8 Tests: Read Them As Executable Requirements

The project uses `node:test` and `node:assert/strict` for focused TypeScript
helper tests. Example structure, shortened from `plan-progress.test.ts`:

```ts
test('advancePlanProgress skips consecutive rest days when rest days are disabled', () => {
  const next = advancePlanProgress(createPlan({ currentDay: 1 }), false);
  assert.equal(next.currentDay, 3);
  assert.equal(next.currentWeek, 1);
});
```

Read it in three stages:

1. **Arrange:** the fixture puts a workout on Monday and rest on Tuesday.
2. **Act:** advance with explicit rest days disabled.
3. **Assert:** the next day counter points at Wednesday, still in week one.

The exact fixture matters. If you changed Tuesday to a workout, expecting
day three would no longer describe the same requirement.

### Fake storage and dependency injection

[workout-storage.test.ts](../src/lib/workout-storage.test.ts) implements
`StorageLike` using a `Map`, plus configurable read/write/removal errors.
The application helper accepts that interface rather than hardcoding all
access to `window.localStorage`.

This is dependency injection: pass the dependency that supplies an effect.
It is similar to passing a fake repository or file-like object to Python
code rather than reaching into a real database during every unit test.

A failure test can preserve a known old snapshot, throw from `setItem`,
attempt an import and assert that no replacement state is returned and the
old value remains. That is stronger evidence than checking only that an
error message string exists.

### Three different verification levels

| Level | Strength | Missing coverage |
| --- | --- | --- |
| Helper tests | Fast, deterministic edge cases and fault injection | React wiring, browser APIs and native lifecycle |
| Production browser checks | Actual built app, routes, inputs, storage, DOM | Phone-specific native behavior |
| Physical Android checks | Actual packaged WebView, picker, process restart | Other Android versions, OEMs and release-only differences |

The completed October 23 device run used a Galaxy S24 on Android 16 and
synthetic data. It checked the native import picker and full force-stop
draft persistence. It verified export **content** using Blob capture, not
native exported-file delivery. Do not erase that distinction when presenting
the results. Evidence is in [the device report](../docs/android-backup-verification-2026-10-23.md).

## 3.9 CI And GitHub Protection

[ci.yml](../.github/workflows/ci.yml) has one job, `validate`: checkout, set
up Node, `npm ci`, TypeScript check and production build. It runs on pull
requests and pushes to main. At this snapshot, it does not run unit tests,
secret scanning or dependency auditing.

The remotely configured main ruleset requires a PR, an up-to-date successful
`validate` check from GitHub Actions, and resolved review conversations. It
blocks force pushes/deletion and has no routine bypass actors. Zero required
approvals accommodates a sole maintainer who cannot approve their own PR.

These controls solve different problems:

- CI produces automated validation evidence.
- Branch protection requires that evidence before normal integration.
- A human or agent review reasons about behavior the checks may miss.
- Release verification checks the artifact actually delivered to users.

Administrators retain authority to edit repository settings. "No bypass
actors" does not mean an administrator can never weaken policy. See
[main protection](../docs/github/main-protection.md) for the dated readback;
repository settings can change independently of local code.

## 3.10 Security Explanations You Should Be Able To Give

### What was improved

Imported JSON is treated as untrusted. File bytes, collection lengths, text,
counts and progression ranges are bounded. Invalid input is rejected rather
than being allowed to determine enormous UI allocations. State replacement
is committed through one complete snapshot rather than separate writes that
could leave a partially imported state. Startup recovery is locked separately
from the current warning message so another failure cannot accidentally
permit defaults to overwrite unreadable original data.

### What these changes do not prove

They do not encrypt workout data, create secure accounts, prevent every
denial-of-service possibility, or certify dependencies free of vulnerabilities.
There is no remote account/authentication system in this app to claim you
implemented. Local storage isolation and device protection are not the same
as application-level encryption.

The security audit recorded dependency advisories and an Android automatic-
backup/privacy mismatch. The Android backup-policy task was deferred, not
fixed. The manifest still has `allowBackup="true"` at this snapshot. Do not
repeat a strict "data can never leave the device automatically" claim based
only on the older README language. Reconcile source, audit, platform behavior
and actual delivered version before making a privacy statement.

The audit is dated evidence, not a permanent list of current vulnerabilities.
Dependency versions and advisories must be rechecked before a release.
Read [security audit](../docs/security-audit-2026-10-22.md), not just a test count.

### Ignore rules are prevention, not historical cleanup

Root `.gitignore` now covers common environment, signing and key filenames.
It deliberately ignores this learning folder too. Ignore rules do not remove
tracked files or old commits, prevent forced staging, or rotate leaked keys.
If you discover a real credential exposure, "I added it to gitignore" is not
an adequate response. See [secret prevention](../docs/secret-prevention.md).

## 3.11 Debugging Playbook You Can Use Yourself

Start with a concrete observation and a reproducible state, not a guessed fix.

| Symptom | First places to inspect |
| --- | --- |
| Weight reverts when leaving detail | Controlled input, draft callback, draft context/source, persistent save warning |
| App exits instead of returning to workout | Route path, `getAndroidBackAction`, native listener lifecycle |
| Plan seems to skip days | `includeRestDays`, schedule entries, currentDay, `advancePlanProgress` |
| PR appears unexpectedly | Workout completion handler, deload guard, today exercise names, PR history logic |
| Import rejected | File bytes, validator result, specific bounded domain, storage write error |
| Data disappears on relaunch | Save success versus pending memory, canonical key, recovery lock, actual installed build |
| Web fix absent on device | Fresh build, Capacitor sync, installed package/version and artifact |
| CI differs from laptop | Node version, clean `npm ci`, lockfile, case-sensitive paths, exact CI steps |

For each bug, write down expected and actual behavior, identify the state at
the boundary, create the smallest test that fails, make a focused fix and
rerun broader checks. Never reproduce destructive backup scenarios against
the user's real storage simply because they are convenient.

## 3.12 Resume And Interview Preparation Without Overclaiming

You can credibly discuss product direction, requirements, acceptance criteria,
agent coordination, review decisions, testing and deployment work you actually
performed. Understanding generated code is also valuable, but it is different
from saying you independently authored it.

Possible wording to adapt only if it matches your actual contribution:

> Directed AI-assisted development and testing of Megalifts, a mobile-first
> React/TypeScript workout tracker packaged for Android with Capacitor;
> defined requirements, coordinated specialist agents, validated persistence
> and navigation flows, and distributed an internal tester release.

After completing the study exercises, you can add precise claims about code
you personally traced, tested, reviewed or changed. Do not list a language as
proficient solely because an agent generated a project in it. Do not claim
user counts, performance improvements, backend architecture or security
certification without evidence.

A good answer to "Did you write it?" is direct:

> I used AI agents for much of the implementation. I led requirements and
> sequencing, tested the Android build and worked through failures. I am now
> studying the code so I can explain the architecture and make focused changes
> myself. Here is a concrete persistence problem and how we verified it.

That answer becomes stronger when followed by a real trace, not when AI
involvement is concealed.

## 3.13 Interview Questions With Answer Outlines

**Why use a static app instead of a backend?**
The current product is device-local and has no accounts/synchronization
requirement. Static delivery keeps runtime infrastructure simple and supports
offline operation. Costs include device-specific storage, manual migration,
no cross-device consistency, and no server-based recovery.

**Why TypeScript if JavaScript runs in the browser?**
It documents shapes and checks many mistakes before runtime. It does not
validate JSON automatically; boundary validators still matter. Strict mode
is not fully enabled in this repo, so avoid overstating compile-time safety.

**What is the hardest persistence edge case?**
Use the unreadable-startup example: fallback defaults are shown, autosave is
paused, a failed import displays a different error, but the original must
remain protected. A separate recovery lock models that invariant correctly.

**What does atomic import mean here?**
A complete canonical JSON snapshot is validated and written in one localStorage
operation before UI state is replaced. A failed write does not partially apply
five independent fields. This is not a distributed database transaction or a
guarantee against physical device loss.

**Why are drafts separate from logs?**
Typing a proposed weight is not completing a set. Drafts preserve unfinished
intent and source information across navigation/relaunch, while completed logs
drive completion behavior and later performance defaults.

**How do you know the app works on Android?**
Describe exact build/sync/package steps and actual device scenarios. Mention
the Galaxy S24/Android 16 test and its isolated data, as well as the unverified
native export delivery and other-device coverage. A desktop screenshot is not
native verification.

**What would you improve next?**
Offer evidence-based candidates: patch/re-audit affected dependencies,
resolve the Android backup policy, verify native export delivery, expand CI
coverage with a compatible Node runtime, strengthen TypeScript configuration
incrementally, and reduce App's orchestration size through careful extraction.
Frame these as future work, not already-shipped improvements.

**What did AI make harder?**
Plausible issues to discuss only if you experienced them: context loss,
unverified assumptions, duplicated defaults, and code that passed helper
tests but failed lifecycle integration. Explain the controls used: bounded
ownership, sequential work, independent review and evidence-based checks.

## 3.14 Practical Assessments

Before considering yourself ready to present this code technically:

1. Explain a log button click through state update, rerender and save without looking at this guide.
2. Trace a failed import and identify the exact point where UI replacement is prevented.
3. Explain why a test with fake storage does not prove the Android file picker works.
4. Add a focused helper test on a disposable branch or practice copy, run it red, make a small change and see it green.
5. Explain which generated artifact must be redistributed after a source fix.
6. Describe one real limitation you would prioritize, with a verification plan.

There is no need to memorize every line. The goal is to locate the relevant
code, explain its contract, predict behavior from inputs, and check your
reasoning with an experiment.
