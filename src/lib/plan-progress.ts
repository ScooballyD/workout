import type { TrainingPlan } from '../types.ts';

const DAYS_PER_WEEK = 7;

const getTotalPlanDays = (plan: TrainingPlan) => plan.durationWeeks * DAYS_PER_WEEK;

export const isPlanComplete = (plan: TrainingPlan) => plan.currentDay > getTotalPlanDays(plan);

export const getPlanProgressSnapshot = (plan: TrainingPlan) => {
  const totalDays = getTotalPlanDays(plan);
  const displayDay = Math.min(plan.currentDay, totalDays);
  const displayWeek = Math.min(Math.ceil(displayDay / DAYS_PER_WEEK), plan.durationWeeks);
  const completedWeeks = Math.min(displayWeek, plan.durationWeeks);
  const progressPercent = Math.round((completedWeeks / plan.durationWeeks) * 100);

  return {
    totalDays,
    displayDay,
    displayWeek,
    progressPercent,
    completedWeeks,
    weeksRemaining: Math.max(0, plan.durationWeeks - completedWeeks),
    isComplete: isPlanComplete(plan),
  };
};

export const advancePlanProgress = (plan: TrainingPlan): TrainingPlan => {
  if (isPlanComplete(plan)) {
    return plan;
  }

  const nextDay = Math.min(plan.currentDay + 1, getTotalPlanDays(plan) + 1);

  return {
    ...plan,
    currentDay: nextDay,
    currentWeek: Math.ceil(nextDay / DAYS_PER_WEEK),
  };
};
