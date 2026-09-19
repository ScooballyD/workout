# Android Tester Packaging

Megalifts now has a Capacitor Android wrapper. The Android app runs from the built web assets bundled into the native project, not from a continuously hosted server.

## Current Identity

- App name: `Megalifts`
- Android app id: `com.megalifts.app`
- Web asset directory: `dist`

Treat the app id as provisional until the release/signing workflow is finalized. Change it before the first signed tester release if needed.

## Repeatable Build Flow

After any web-app change that should reach Android testers:

1. Run `npm run lint`
2. Run `npm test`
3. Run `npm run build:android:web`
4. Run `npm run sync:android`

At that point the updated web bundle is copied into [android](C:/Users/carve/OneDrive/Projects/workout/android) and ready for Android Studio or `npx cap run android`.

## Useful Commands

- `npm run build:android:web`: builds the current web bundle into `dist`
- `npm run sync:android`: copies the built web assets into the Android project and updates native dependencies
- `npm run copy:android`: copies web assets only, without the full sync step
- `npm run open:android`: opens the native Android project in Android Studio
- `npm run run:android`: runs the Android app on an emulator or connected device

## Important Rules

- Android tester updates are not server-only deploys. Web changes do not reach installed Android testers until you rebuild and sync the Capacitor project, then produce and distribute a new Android build.
- Keep `dist` as the source for the packaged Android assets.
- Re-check routing and persistence after changes that touch app startup, navigation, or local storage behavior.
- Do not commit signing keys, passwords, or release credentials to the repo.
