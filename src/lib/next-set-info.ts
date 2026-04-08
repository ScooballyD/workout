import type { Exercise, TrainingPlan } from '../types.ts';
import { getNextIncompleteSetIndex } from './exercise-progress.ts';
import { getPlanExerciseSetCount, getPlanWeight } from './deload.ts';

const roundGeneratedWeight = (weight: number) =>
  Math.round(weight * 4) / 4;

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
    defaultWeight: roundGeneratedWeight(getPlanWeight(defaultWeight, plan, currentWeek)),
    defaultReps,
  };
}

export function getNextSetDisplayValues(
  exercise: Exercise,
  {
    autoIncrement,
    currentWeek,
    plan,
    unit,
  }: {
    autoIncrement: boolean;
    currentWeek: number;
    plan?: TrainingPlan;
    unit: 'lbs' | 'kg';
  }
) {
  const nextSetInfo = getNextSetInfo(exercise, {
    autoIncrement,
    currentWeek,
    plan,
  });

  if (nextSetInfo.actualSetIndex === null) {
    return {
      weight: '-',
      reps: '-',
    };
  }

  return {
    weight:
      nextSetInfo.defaultWeight > 0
        ? `${nextSetInfo.defaultWeight}${unit.toUpperCase()}`
        : '-',
    reps: nextSetInfo.defaultReps > 0
      ? String(nextSetInfo.defaultReps)
      : exercise.reps,
  };
}
