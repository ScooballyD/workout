import type { TrainingPlan } from '../types.ts';

const DAYS_PER_WEEK = 7;
const DEFAULT_WORKING_SET_COUNT = 2;

export const normalizePlanExerciseName = (value: string) => value.trim().toUpperCase();

const collectPlanExerciseNames = (schedule: TrainingPlan['schedule']) => {
  const exerciseNames = new Set<string>();

  for (const day of Object.values(schedule)) {
    for (const exerciseName of day.exercises ?? []) {
      exerciseNames.add(normalizePlanExerciseName(exerciseName));
    }
  }

  return exerciseNames;
};

export const buildPlanExerciseSetCounts = (
  schedule: TrainingPlan['schedule'],
  existingCounts?: Record<string, number>
): Record<string, number> => {
  const nextCounts: Record<string, number> = {};
  const normalizedExistingCounts = existingCounts
    ? Object.entries(existingCounts).reduce<Record<string, number>>((counts, [exerciseName, count]) => {
        if (Number.isInteger(count) && count > 0) {
          counts[normalizePlanExerciseName(exerciseName)] = count;
        }
        return counts;
      }, {})
    : undefined;

  for (const exerciseName of collectPlanExerciseNames(schedule)) {
    nextCounts[exerciseName] =
      normalizedExistingCounts?.[exerciseName] ?? DEFAULT_WORKING_SET_COUNT;
  }

  return nextCounts;
};

const getTotalPlanDays = (plan: TrainingPlan) => plan.durationWeeks * DAYS_PER_WEEK;

export const restartPlanProgress = (plan: TrainingPlan): TrainingPlan => ({
  ...plan,
  currentWeek: 1,
  currentDay: 1,
  exerciseSetCounts: buildPlanExerciseSetCounts(plan.schedule),
});

export const mergePlanEdits = (
  existingPlan: TrainingPlan,
  editedPlan: TrainingPlan
): TrainingPlan => {
  const totalDays = editedPlan.durationWeeks * DAYS_PER_WEEK;
  const currentDay = Math.min(existingPlan.currentDay, totalDays);

  return {
    ...editedPlan,
    currentDay,
    currentWeek: Math.max(1, Math.ceil(currentDay / DAYS_PER_WEEK)),
    exerciseSetCounts: buildPlanExerciseSetCounts(
      editedPlan.schedule,
      existingPlan.exerciseSetCounts
    ),
  };
};

export const replacePlanById = (
  plans: TrainingPlan[],
  nextPlan: TrainingPlan
): TrainingPlan[] =>
  plans.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan));

export const deletePlanById = (
  plans: TrainingPlan[],
  planId: string,
  activePlanId: string | null
): { plans: TrainingPlan[]; activePlanId: string | null } => {
  const nextPlans = plans.filter((plan) => plan.id !== planId);

  return {
    plans: nextPlans,
    activePlanId: activePlanId === planId ? null : activePlanId,
  };
};
