import type { Exercise, TrainingPlan } from '../types.ts';

export const DELOAD_WEIGHT_MULTIPLIER = 0.75;
export const DELOAD_SET_MULTIPLIER = 0.75;
export const DELOAD_WEIGHT_ROUNDING = 'preserve-decimals' as const;

export const isDeloadWeek = (
  plan: TrainingPlan | undefined,
  week: number
): boolean => Boolean(plan?.deload?.enabled && week === plan.durationWeeks);

export const getDeloadSetCount = (sets: number): number =>
  Math.max(1, Math.ceil(sets * DELOAD_SET_MULTIPLIER));

// Deload weights intentionally preserve decimals instead of rounding to whole numbers.
export const applyDeloadWeight = (weight: number): number =>
  weight * DELOAD_WEIGHT_MULTIPLIER;

export const getPlanExerciseSetCount = (
  exercise: Pick<Exercise, 'sets'>,
  plan: TrainingPlan | undefined,
  week: number
): number => (isDeloadWeek(plan, week) ? getDeloadSetCount(exercise.sets) : exercise.sets);

export const getPlanWeight = (
  weight: number,
  plan: TrainingPlan | undefined,
  week: number
): number => (isDeloadWeek(plan, week) ? applyDeloadWeight(weight) : weight);
