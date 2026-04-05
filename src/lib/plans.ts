import type { TrainingPlan } from '../types.ts';

const DAYS_PER_WEEK = 7;

export const restartPlanProgress = (plan: TrainingPlan): TrainingPlan => ({
  ...plan,
  currentWeek: 1,
  currentDay: 1,
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
