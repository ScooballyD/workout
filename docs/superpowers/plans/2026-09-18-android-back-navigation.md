# Android Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Android system back navigate out of nested Megalifts routes before exiting the Capacitor app, while preserving browser/PWA navigation.

**Architecture:** Install the official Capacitor App plugin and mount one Android-only back listener inside `BrowserRouter`. Keep the route decision in a pure helper so Node tests can cover root exit, history navigation, and direct-route fallback without loading native APIs.

**Tech Stack:** React 19, React Router 7, TypeScript, Capacitor 8 App plugin, Node test runner, Android WebView

---

### Task 1: Add the Capacitor App plugin

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `android/capacitor.settings.gradle`
- Modify: `android/app/capacitor.build.gradle`

- [ ] **Step 1: Install the official plugin**

Run:

```powershell
npm install @capacitor/app
```

Expected: `@capacitor/app` is added to `dependencies` at the Capacitor 8-compatible release and the lockfile is updated.

- [ ] **Step 2: Sync the plugin into Android**

Run:

```powershell
npm run sync:android
```

Expected: Capacitor reports that `@capacitor/app` is detected and synced for Android.

- [ ] **Step 3: Confirm the generated Android linkage**

Run:

```powershell
rg -n "capacitor-app" android/capacitor.settings.gradle android/app/capacitor.build.gradle package.json
```

Expected: the package and generated Gradle linkage are present.

- [ ] **Step 4: Commit the dependency slice when repository state permits**

```powershell
git add package.json package-lock.json android/capacitor.settings.gradle android/app/capacitor.build.gradle
git commit -m "Add Capacitor app navigation plugin"
```

If those files still contain the uncommitted baseline Android-wrapper work, do not create a misleading partial commit; report that integration constraint and keep the files unstaged for the manager.

### Task 2: Define and test the route decision

**Files:**
- Create: `src/lib/android-back.ts`
- Create: `src/lib/android-back.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/lib/android-back.test.ts`:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';

import { getAndroidBackAction } from './android-back.ts';

test('getAndroidBackAction exits only from the root route', () => {
  assert.equal(getAndroidBackAction('/', true), 'exit-app');
});

test('getAndroidBackAction uses route history for nested routes when available', () => {
  assert.equal(getAndroidBackAction('/exercise/bench', true), 'history-back');
  assert.equal(getAndroidBackAction('/plans', true), 'history-back');
});

test('getAndroidBackAction returns to root when a nested route has no history', () => {
  assert.equal(getAndroidBackAction('/exercise/bench', false), 'navigate-root');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
node --test --test-isolation=none --experimental-strip-types src/lib/android-back.test.ts
```

Expected: FAIL because `src/lib/android-back.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Create `src/lib/android-back.ts`:

```typescript
export type AndroidBackAction =
  | 'history-back'
  | 'navigate-root'
  | 'exit-app';

export const getAndroidBackAction = (
  pathname: string,
  canGoBack: boolean
): AndroidBackAction => {
  if (pathname === '/') {
    return 'exit-app';
  }

  return canGoBack ? 'history-back' : 'navigate-root';
};
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
node --test --test-isolation=none --experimental-strip-types src/lib/android-back.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the helper slice**

```powershell
git add src/lib/android-back.ts src/lib/android-back.test.ts
git commit -m "Test Android back route decisions"
```

### Task 3: Register one Android-only back listener

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add native and helper imports**

Add:

```typescript
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { getAndroidBackAction } from './lib/android-back';
```

- [ ] **Step 2: Add a router-aware listener component**

Place this component near `BottomNav` so it remains mounted for the life of the router:

```typescript
const AndroidBackHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    let disposed = false;
    let listener: PluginListenerHandle | undefined;

    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const action = getAndroidBackAction(pathnameRef.current, canGoBack);

      if (action === 'history-back') {
        navigate(-1);
        return;
      }

      if (action === 'navigate-root') {
        navigate('/', { replace: true });
        return;
      }

      void CapacitorApp.exitApp();
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }

      listener = handle;
    });

    return () => {
      disposed = true;
      if (listener) {
        void listener.remove();
      }
    };
  }, [navigate]);

  return null;
};
```

This registers only on Android, keeps the current pathname fresh without re-registering on each route change, and removes the listener during Strict Mode cleanup.

- [ ] **Step 3: Mount the listener inside the router**

Add `<AndroidBackHandler />` immediately inside `<Router>` and before the app layout:

```tsx
<Router>
  <AndroidBackHandler />
  <div className="min-h-screen bg-black text-text-main flex flex-col">
```

- [ ] **Step 4: Run focused and full automated checks**

Run:

```powershell
node --test --test-isolation=none --experimental-strip-types src/lib/android-back.test.ts
npm test
npm run lint
```

Expected: all tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the integration slice**

```powershell
git add src/App.tsx
git commit -m "Handle Android back navigation"
```

### Task 4: Build, sync, and verify on web and Android

**Files:**
- Review: `dist/`
- Review: generated Android assets under `android/app/src/main/assets/public/`

- [ ] **Step 1: Build the packaged web application**

Run:

```powershell
npm run build:android:web
```

Expected: Vite and PWA generation complete successfully.

- [ ] **Step 2: Sync the final bundle and plugin**

Run:

```powershell
npm run sync:android
```

Expected: web assets and `@capacitor/app` sync successfully.

- [ ] **Step 3: Verify ordinary browser navigation still works**

Run:

```powershell
npm run preview -- --host 127.0.0.1 --strictPort --port 4173
```

Check `/`, `/plans`, `/settings`, and an exercise-detail route through normal in-app navigation. Expected: browser navigation remains unchanged because the native listener is Android-gated.

- [ ] **Step 4: Install and launch on the connected Android device**

Run:

```powershell
npm run run:android
```

Select the connected physical device. Expected: the debug app installs and launches.

- [ ] **Step 5: Run the physical-device back-navigation matrix**

Verify all cases:

- Open an exercise detail from Grind, press Android back, and confirm Grind remains visible.
- Reopen exercise detail, use the toolbar arrow, and confirm Grind remains visible.
- Open Plans, Settings, and PR Vault through bottom navigation; press Android back and confirm app history is followed.
- Navigate through multiple screens and press back repeatedly; confirm one route is removed per press with no duplicate listener behavior.
- Launch or return to `/`, press Android back, and confirm the app exits to the home screen.
- Relaunch and confirm there is no blank screen or startup regression.

- [ ] **Step 6: Inspect runtime errors**

Run while the app is active:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$appPid = & $adb shell pidof com.megalifts.app
& $adb logcat --pid=$appPid -d -t 500 | Select-String 'FATAL EXCEPTION|AndroidRuntime|Capacitor.*(error|ERROR)|chromium.*ERROR'
```

Expected: no fatal runtime or Capacitor back-listener errors.

### Task 5: Record the durable Android navigation pattern and close the task

**Files:**
- Modify: `agent_docs/codex.md`
- Modify: `agent_docs/pwa-build.md`
- Modify: `todo.md`

- [ ] **Step 1: Add the repository-specific failure pattern**

Add a concise `codex.md` entry documenting:

- Capacitor Android does not automatically mirror React Router history when the App plugin back listener is absent.
- Register one Android-only listener inside the router.
- Use history for nested routes, a root fallback for direct nested launches, and `exitApp()` only at `/`.
- Clean up the asynchronous listener so React Strict Mode does not duplicate it.
- Rebuild and sync before device verification.

- [ ] **Step 2: Update the build playbook**

Add the Android system-back matrix to `agent_docs/pwa-build.md` verification expectations for future routing changes.

- [ ] **Step 3: Update the task tracker after physical verification**

Remove completed task 1 from `Current tasks`, renumber the remaining tasks, and add this concise completed summary:

```markdown
3. [P1] Android system back now follows Megalifts route history on nested screens and exits only from the root route, with toolbar and browser navigation preserved.
```

- [ ] **Step 4: Run final verification**

Run:

```powershell
npm test
npm run lint
npm run build:android:web
npm run sync:android
```

Expected: every command succeeds, followed by the completed physical-device matrix from Task 4.

- [ ] **Step 5: Commit documentation and tracker updates when repository state permits**

```powershell
git add agent_docs/codex.md agent_docs/pwa-build.md todo.md
git commit -m "Document Android back navigation"
```

If `todo.md` or `agent_docs/pwa-build.md` still contains earlier uncommitted Android-wrapper documentation, leave commit integration to the manager rather than claiming those unrelated lines as this task's isolated commit.
