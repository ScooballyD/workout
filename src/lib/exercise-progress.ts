import type { SetLog } from '../types.ts';

export function getNextIncompleteSetIndex(
  logs: Array<SetLog | undefined>,
  sets: number
): number | null {
  for (let i = 0; i < sets; i++) {
    if (!logs[i]?.completed) {
      return i;
    }
  }

  return null;
}
