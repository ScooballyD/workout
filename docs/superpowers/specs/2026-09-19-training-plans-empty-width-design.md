# Training Plans Empty-State Width Design

## Goal

Make the empty Training Plans screen use the same comfortable phone-width layout as the populated Plans screen, without changing its existing padding, max-width, content, or desktop behavior.

## Cause

`TrainingPlans` uses a capped, centered root container but does not explicitly claim the available horizontal width. When no plan cards are rendered, the root can shrink around the empty content and make the screen look compressed.

## Design

Add Tailwind's `w-full` utility to the root `TrainingPlans` motion container in `src/App.tsx`. The existing `max-w-2xl mx-auto` remains unchanged, so the page fills the available width on phones while remaining capped and centered on larger screens.

No data model, routing, dependency, or visual-language changes are required. The populated state shares the root container and should retain its current spacing.

## Acceptance

- With no saved plans, Training Plans fills the usable phone width inside its current horizontal padding.
- With one or more plans, the existing width, cap, and spacing remain unchanged.
- `npm run lint` and `npm run build` pass.
- The two states are checked on the connected Android device at the same viewport.
