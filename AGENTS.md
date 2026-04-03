# AGENTS.md

## Project overview
- This project is a Vite + React + TypeScript Progressive Web App intended to work well on a user's phone.
- Optimize for fast startup, low memory use, responsive interactions, and reliable standalone behavior when installed from a supported mobile browser.
- Prefer solutions that keep the app lightweight and static-host friendly. Avoid changes that assume a server is available at runtime.

## Dev environment tips
- Use `npm install` to install dependencies.
- Use `npm run dev` for local development.
- Use `npm run build` to create the production bundle in `dist/`.
- Use `npm run preview` to verify the production build locally.
- Use `npm run lint` before finishing work. In this repo it runs TypeScript checks with `tsc --noEmit`.
- Use `npm run clean` to remove `dist/` when you need a clean build.
- Read `README.md` and `package.json` before adding new tooling so commands stay aligned with the project's current setup.

## Coding practices and conventions
- Use TypeScript-first React code. Prefer clear types and simple data flow over clever abstractions.
- Prefer functional components and keep component responsibilities narrow.
- Reuse existing constants, utility helpers, and shared types before adding new patterns.
- Keep files focused. If a component starts handling unrelated concerns, split it into smaller units.
- Preserve the existing Vite static-app model and avoid introducing server-dependent architecture unless explicitly requested.
- Prefer ASCII in source files unless the file already requires other characters.
- Add comments only when the reasoning is not obvious from the code itself.

## Mobile and performance priorities
- Treat phone performance as a primary requirement, not a polish task.
- Minimize JavaScript shipped to the client. Do not add dependencies unless the benefit clearly outweighs bundle cost.
- Prefer built-in browser capabilities and existing project utilities over large third-party packages.
- Avoid unnecessary rerenders, long animation chains, and heavy effects that can drain battery or hurt lower-end devices.
- Keep initial render paths lean. Defer non-critical work and avoid blocking startup with expensive computation.
- Be careful with persistent storage and offline logic. Favor predictable, resilient behavior over aggressive caching strategies.
- Ensure changes still make sense in standalone PWA mode, including smaller screens, touch input, and variable network quality.

## UI and UX guidance
- Design for mobile-first layouts before considering larger screens.
- Favor clarity, tap-target size, and quick comprehension over visual complexity.
- Keep accessibility in scope: readable contrast, semantic structure, and keyboard-safe behavior where applicable.
- When adding motion, make it purposeful and lightweight.

## Testing and verification instructions
- Run `npm run lint` after code changes.
- Run `npm run build` before considering the work complete so type and production build issues are caught.
- If a change affects installability, offline behavior, routing, or persisted state, verify it in `npm run preview` as well.
- Add or update tests if the repository later gains a test runner. For now, do not claim behavior is verified without at least running the available checks.

## Planning instructions
- For large, risky, or multi-step tasks, create and maintain an execution plan using `plans.md` at the repo root.
- Use `plans.md` when the work spans multiple files, changes persisted data or PWA behavior, involves refactoring, or is likely to require handoff between agents.
- Follow the format and maintenance rules in `plans.md`, and keep the plan current as decisions, progress, and discoveries change.

## Change instructions
- Keep edits incremental and easy to review.
- Do not perform broad refactors unless they directly support the requested task.
- Call out tradeoffs when a feature request risks hurting bundle size, startup time, offline behavior, or phone usability.
- If you add a dependency, explain why it is necessary and why a lighter approach was not sufficient.
- Before finishing, confirm that commands and documentation still reflect the current repo state.
