# Megalifts: Private Code Study Guide

Prepared for a Python programmer learning to explain and maintain an
AI-assisted TypeScript/React project. Source snapshot: **2026-10-23**.

This folder is intentionally excluded by the repository's root `.gitignore`.
It is a local study aid, not public product documentation. Ignore rules do
not encrypt it or prevent someone from deliberately force-adding it.

## Read In This Order

1. [TypeScript and React for a Python programmer](01-typescript-and-react.md): syntax, runtime model, types, transformations, JSX, state, effects and practice answers.
2. [Source-level code walkthrough](02-code-walkthrough.md): architecture, actual domain rules, event/data flows, storage, plans, PR Vault and guided tracing.
3. [Build, testing, Android and interviews](03-build-testing-and-interviews.md): commands, PWA/Capacitor delivery, tests, security boundaries, debugging and honest resume explanations.

Read with the repository open beside the guide. Function names are better
navigation anchors than memorized line numbers; lines move as the code changes.
Links point to real source files rather than copied, supposedly authoritative
versions of entire modules.

## The Thirty-Second Architecture

```text
User touches a React screen
        |
        v
App handler coordinates domain helpers
        |
        v
Root workout state changes --> React updates the visible UI
        |
        v
Guarded persistence writes one validated localStorage snapshot

Exception: import must save successfully BEFORE adopting replacement UI state.

Vite builds these screens/helpers into static web assets.
The PWA runs them in a browser; Capacitor packages them in an Android WebView.
```

The central distinction is not "frontend versus backend" here. It is
**presentation, domain computation, state coordination, persistence, and
platform integration** inside a predominantly client-side application.

## What This Guide Describes

It describes the **current working tree**, including recent uncommitted
persistence changes. The tester release already installed through Google Play
can contain an earlier version. A local source fix is not automatically a
deployed phone update. The guide does not certify the code as secure, claim
every historical task was implemented perfectly, or replace live verification.

Small quoted excerpts are identified as actual or shortened source. Teaching
examples are explicitly labeled. Python comparisons explain an idea but do
not imply the two languages/frameworks have identical runtime behavior.

When this guide and the source disagree, investigate the source, tests and
current requirements. Do not silently change the code to match the guide.

## A Practical Study Schedule

Treat these as sessions, not deadlines. Repeat a session until you can answer
its questions without reading prepared text.

| Session | Read and do | Evidence of understanding |
| --- | --- | --- |
| 1 | Chapter 1 through types and array transformations; open `src/types.ts` | Explain one Exercise object and the difference between logs and lastLogs |
| 2 | React sections; open App's state adapter and detail inputs | Predict what happens when a user types without logging |
| 3 | Chapter 2 startup/storage/import trace | Explain why invalid stored data must not be overwritten by defaults |
| 4 | Chapter 2 workout, plan and PR flows | Trace one workout completion, including rest-day and deload branches |
| 5 | Chapter 3 toolchain, tests and Android | Explain dev server versus production bundle versus installed app |
| 6 | Reproduce a synthetic helper test in a practice copy | Show a failing assertion, understand its cause, then make it pass |
| 7 | Record a five-minute project explanation and answer the questions below | Use accurate claims and name concrete tradeoffs without memorizing jargon |

Do not import practice backups into your real workout profile or clear app
data as a learning shortcut. Use a separate browser profile, practice copy or
isolated verification package. Keep private backups outside this public repo.

## Code Reading Method

For each function, write five things in your own words:

1. What inputs does it receive? Which can be absent or invalid?
2. What value does it return? Does it mutate input, compute a new value, or perform an effect?
3. Who calls it, and what happens to its result?
4. What invariant must remain true after it runs?
5. Which test demonstrates that invariant, and what case remains unverified?

Example invariant: "A failed import must preserve the previously displayed
state and the previous complete saved snapshot." This is more useful than
"the function uses JSON."

If you get lost in App's JSX, first find a named handler, then read the
helper it calls, then the test fixture. Return to the UI after the data
transformation makes sense. Reading the large multi-screen source file from
top to bottom is not the only or best entry point.

## Self-Assessment Questions

- Can I explain which code runs in Node, in the browser, and through Android integration?
- Can I distinguish a TypeScript interface from a runtime validator?
- Can I explain a functional state update and why direct nested mutation is risky?
- Can I trace the source of a suggested set weight rather than guessing from the UI?
- Can I distinguish editing a draft, logging a set and completing a workout?
- Can I explain the canonical snapshot, legacy migration and recovery lock?
- Can I describe what tests and CI actually run, including their gaps?
- Can I state my own role honestly and demonstrate one small code change myself?

You are ready to discuss the project when you can reason through an unfamiliar
variant of these questions, not just repeat the sample interview answers.

## Small Glossary

| Term | Meaning in this project |
| --- | --- |
| Component | React function describing part of the UI |
| Prop | Input supplied by a parent component |
| State | Data React retains and uses to render a component |
| Hook | React API for state/lifecycle capabilities, called under hook rules |
| Ref | Persistent mutable container whose changes do not themselves rerender |
| Effect | Synchronization with an external system after commit |
| Domain helper | Function implementing workout/plan rules rather than layout |
| Normalization | Converting accepted shapes into a consistent application shape |
| Validation | Checking whether external input satisfies required structure/ranges |
| Canonical snapshot | Authoritative complete saved workout state |
| Draft | Unlogged input edits, including source/context metadata |
| PWA | Install-capable web app with manifest/service-worker infrastructure |
| WebView | Browser engine embedded in the Android host application |
| CDP | Debugging protocol used to automate the isolated WebView tests |
| Invariant | A property that must remain true across an operation |
| Regression test | A test intended to catch reintroduction of a known failure |

## Reference Sources

The guide is primarily grounded in the local source and tests. Language and
React explanations were checked against the official TypeScript handbook and
React documentation using current documentation lookup. Chapter 1 links those
sources. Project-specific evidence is in the linked audit, build and device
reports, with dated limitations preserved.
