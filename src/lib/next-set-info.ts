import type { Exercise, TrainingPlan } from '../types.ts';
import { getNextIncompleteSetIndex } from './exercise-progress.ts';
import { getPlanExerciseSetCount, getPlanWeight } from './deload.ts';

export function getNextSetInfo(
  exercise: Exercise,
  {
    autoIncrement,
    currentWeek,
    plan,
  }: {
    autoIncrement: boolean;
    currentWeek: number;
    plan?: TrainingPlan;
  }
) {
  const planSetCount = getPlanExerciseSetCount(exercise, plan, currentWeek);
  const actualSetIndex = getNextIncompleteSetIndex(exercise.logs, planSetCount);

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

  return {
    actualSetIndex,
    defaultWeight: getPlanWeight(defaultWeight, plan, currentWeek),
    defaultReps,
  };
}
