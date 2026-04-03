import type { Exercise } from '../types.ts';

export type ExerciseLogInputSource = 'default' | 'manual' | 'propagated';

export interface ExerciseLogInputValue {
  weight: number;
  reps: number;
  weightSource: ExerciseLogInputSource;
  repsSource: ExerciseLogInputSource;
}

interface ExerciseLogDefaultsOptions {
  autoIncrement: boolean;
  currentWeek: number;
}

const getDefaultForSet = (
  exercise: Exercise,
  setIndex: number,
  { autoIncrement, currentWeek }: ExerciseLogDefaultsOptions
) => {
  let weight = exercise.recommended?.weight || 0;
  let reps = exercise.recommended?.reps || 0;
  const lastLog = exercise.lastLogs?.[setIndex];

  if (lastLog?.completed) {
    weight = lastLog.weight;
    reps = lastLog.reps + (autoIncrement ? 1 : 0);
  } else if (autoIncrement && currentWeek > 1) {
    reps += currentWeek - 1;
  }

  return { weight, reps };
};

export const createExerciseLogInputValues = (
  exercise: Exercise,
  options: ExerciseLogDefaultsOptions
): ExerciseLogInputValue[] =>
  Array.from({ length: exercise.sets }, (_, index) => {
    const defaults = getDefaultForSet(exercise, index, options);
    return {
      ...defaults,
      weightSource: 'default',
      repsSource: 'default',
    };
  });

export const syncExerciseLogInputValues = (
  previousValues: ExerciseLogInputValue[],
  exercise: Exercise,
  options: ExerciseLogDefaultsOptions,
  resetDrafts = false
): ExerciseLogInputValue[] =>
  Array.from({ length: exercise.sets }, (_, index) => {
    const log = exercise.logs[index];
    if (log?.completed) {
      return {
        weight: log.weight,
        reps: log.reps,
        weightSource: 'manual',
        repsSource: 'manual',
      };
    }

    const defaults = getDefaultForSet(exercise, index, options);
    const previous = resetDrafts ? undefined : previousValues[index];
    const weightSource = previous?.weightSource ?? 'default';
    const repsSource = previous?.repsSource ?? 'default';

    return {
      weight: weightSource === 'default' ? defaults.weight : previous!.weight,
      reps: repsSource === 'default' ? defaults.reps : previous!.reps,
      weightSource,
      repsSource,
    };
  });

export const applyWeightChangeToInputs = (
  previousValues: ExerciseLogInputValue[],
  exercise: Exercise,
  setIndex: number,
  weight: number,
  matchWeight: boolean
): ExerciseLogInputValue[] => {
  const nextValues = [...previousValues];
  nextValues[setIndex] = {
    ...nextValues[setIndex],
    weight,
    weightSource: 'manual',
  };

  if (!matchWeight) {
    return nextValues;
  }

  for (let index = setIndex + 1; index < exercise.sets; index += 1) {
    if (exercise.logs[index]?.completed) {
      continue;
    }

    if (nextValues[index]?.weightSource === 'manual') {
      continue;
    }

    nextValues[index] = {
      ...nextValues[index],
      weight,
      weightSource: 'propagated',
    };
  }

  return nextValues;
};

export const applyRepsChangeToInputs = (
  previousValues: ExerciseLogInputValue[],
  setIndex: number,
  reps: number
): ExerciseLogInputValue[] => {
  const nextValues = [...previousValues];
  nextValues[setIndex] = {
    ...nextValues[setIndex],
    reps,
    repsSource: 'manual',
  };
  return nextValues;
};
