export type AndroidBackAction = 'history-back' | 'navigate-root' | 'exit-app';

export function getAndroidBackAction(
  pathname: string,
  canGoBack: boolean,
): AndroidBackAction {
  if (pathname === '/') {
    return 'exit-app';
  }

  return canGoBack ? 'history-back' : 'navigate-root';
}
