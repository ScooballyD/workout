import type { Exercise } from '../types.ts';
import { getNextIncompleteSetIndex } from './exercise-progress.ts';

export function getNextSetInfo(
  exercise: Exercise,
  {
    autoIncrement,
    currentWeek,
  }: {
    autoIncrement: boolean;
    currentWeek: number;
  }
) {
  const actualSetIndex = getNextIncompleteSetIndex(exercise.logs, exercise.sets);

  let defaultWeight = exercise.recommended?.weight || 0;
  let defaultReps = exercise.recommended?.reps || 0;

  if (actualSetIndex !== null) {
    const lastLog = exercise.lastLogs?.[actualSetIndex];
    if (lastLog?.completed) {
      defaultWeight = lastLog.weight;
      defaultReps = lastLog.reps + (autoIncrement ? 1 : 0);
    } else if (autoIncrement && currentWeek > 1) {
      defaultReps += (currentWeek - 1);
    }
  } else if (autoIncrement && currentWeek > 1) {
    defaultReps += (currentWeek - 1);
  }

  return { actualSetIndex, defaultWeight, defaultReps };
}
