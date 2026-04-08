import type { Exercise, PR, Settings, SetLog, TrainingPlan } from '../types';
import { normalizePrimaryMuscleGroup } from './exercise-tags.ts';
import {
  buildPlanExerciseSetCounts,
  normalizePlanExerciseName,
} from './plans.ts';

const PLAN_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lbs',
  hapticFeedback: true,
  matchWeight: true,
};

export type ImportedBackupData = {
  exercises: Exercise[];
  prs: PR[];
  plans: TrainingPlan[];
  activePlanId: string | null;
  settings: Settings;
};

type ImportValidationResult =
  | {
      ok: true;
      value: ImportedBackupData;
    }
  | {
      ok: false;
      error: string;
    };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && typeof value === 'number' && value > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSetLog = (value: unknown): value is SetLog =>
  isObject(value) &&
  isFiniteNumber(value.weight) &&
  isFiniteNumber(value.reps) &&
  typeof value.completed === 'boolean';

const normalizeLogArray = (value: unknown): Array<SetLog | undefined> | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const logs: Array<SetLog | undefined> = [];
  for (const item of value) {
    if (item === null) {
      logs.push(undefined);
      continue;
    }

    if (!isSetLog(item)) {
      return null;
    }

    logs.push(item);
  }

  return logs;
};

const isRecommended = (value: unknown): value is NonNullable<Exercise['recommended']> =>
  isObject(value) &&
  isFiniteNumber(value.weight) &&
  isFiniteNumber(value.reps);

const normalizeExercise = (value: unknown): Exercise | null => {
  if (!isObject(value)) {
    return null;
  }

  const sets = value.sets;
  const logs = normalizeLogArray(value.logs);
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isPositiveInteger(sets) ||
    typeof value.reps !== 'string' ||
    logs === null
  ) {
    return null;
  }

  const exercise: Exercise = {
    id: value.id,
    name: value.name,
    primaryMuscle: normalizePrimaryMuscleGroup(value.primaryMuscle),
    sets,
    reps: value.reps,
    logs,
  };

  if (value.lastLogs !== undefined) {
    const lastLogs = normalizeLogArray(value.lastLogs);
    if (lastLogs === null) {
      return null;
    }
    exercise.lastLogs = lastLogs;
  }

  if (value.recommended !== undefined) {
    if (!isRecommended(value.recommended)) {
      return null;
    }
    exercise.recommended = value.recommended;
  }

  return exercise;
};

const normalizeExercises = (value: unknown): Exercise[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const exercises: Exercise[] = [];
  for (const item of value) {
    const exercise = normalizeExercise(item);
    if (!exercise) {
      return null;
    }
    exercises.push(exercise);
  }

  return exercises;
};

const isPrHistoryEntry = (value: unknown): value is PR['history'][number] =>
  isObject(value) &&
  isFiniteNumber(value.weight) &&
  typeof value.date === 'string';

const normalizePr = (value: unknown): PR | null => {
  if (
    !isObject(value) ||
    typeof value.exerciseId !== 'string' ||
    typeof value.exerciseName !== 'string' ||
    !isFiniteNumber(value.weight) ||
    typeof value.date !== 'string' ||
    !Array.isArray(value.history) ||
    !value.history.every(isPrHistoryEntry)
  ) {
    return null;
  }

  return {
    exerciseId: value.exerciseId,
    exerciseName: value.exerciseName,
    weight: value.weight,
    date: value.date,
    history: value.history,
  };
};

const normalizePrs = (value: unknown): PR[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const prs: PR[] = [];
  for (const item of value) {
    const pr = normalizePr(item);
    if (!pr) {
      return null;
    }
    prs.push(pr);
  }

  return prs;
};

const normalizePlanDay = (
  value: unknown
): TrainingPlan['schedule'][string] | null => {
  if (
    !isObject(value) ||
    (value.type !== 'workout' && value.type !== 'rest')
  ) {
    return null;
  }

  const workoutId = value.workoutId;
  if (workoutId !== undefined && typeof workoutId !== 'string') {
    return null;
  }

  const exercises = value.exercises;
  if (exercises !== undefined && !isStringArray(exercises)) {
    return null;
  }

  const description = value.description;
  if (description !== undefined && typeof description !== 'string') {
    return null;
  }

  return {
    type: value.type,
    workoutId: typeof workoutId === 'string' ? workoutId : undefined,
    exercises: Array.isArray(exercises) ? exercises : undefined,
    description: typeof description === 'string' ? description : undefined,
  };
};

const normalizeSchedule = (value: unknown): TrainingPlan['schedule'] | null => {
  if (!isObject(value)) {
    return null;
  }

  if (Object.keys(value).length !== PLAN_DAYS.length) {
    return null;
  }

  const schedule: TrainingPlan['schedule'] = {};
  for (const day of PLAN_DAYS) {
    if (!(day in value)) {
      return null;
    }

    const normalizedDay = normalizePlanDay(value[day]);
    if (!normalizedDay) {
      return null;
    }

    schedule[day] = normalizedDay;
  }

  return schedule;
};

const normalizePlanExerciseSetCounts = (
  value: unknown,
  schedule: TrainingPlan['schedule']
): Record<string, number> | null => {
  if (value === undefined) {
    return buildPlanExerciseSetCounts(schedule);
  }

  if (!isObject(value)) {
    return null;
  }

  const counts: Record<string, number> = {};
  for (const [exerciseName, count] of Object.entries(value)) {
    if (!isPositiveInteger(count)) {
      return null;
    }

    counts[normalizePlanExerciseName(exerciseName)] = count;
  }

  return buildPlanExerciseSetCounts(schedule, counts);
};

const normalizePlanDeload = (
  value: unknown,
  durationWeeks: number
): TrainingPlan['deload'] | null => {
  if (!isObject(value)) {
    return null;
  }

  if (value.enabled !== true || !isPositiveInteger(value.baseDurationWeeks)) {
    return null;
  }

  if (durationWeeks !== value.baseDurationWeeks + 1) {
    return null;
  }

  return {
    enabled: true,
    baseDurationWeeks: value.baseDurationWeeks,
  };
};

const normalizePlan = (value: unknown): TrainingPlan | null => {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isPositiveInteger(value.durationWeeks) ||
    !isPositiveInteger(value.currentWeek) ||
    !isPositiveInteger(value.currentDay)
  ) {
    return null;
  }

  const durationWeeks = value.durationWeeks;
  const currentWeek = value.currentWeek;
  const currentDay = value.currentDay;
  const schedule = normalizeSchedule(value.schedule);
  if (!schedule) {
    return null;
  }

  const exerciseSetCounts = normalizePlanExerciseSetCounts(
    value.exerciseSetCounts,
    schedule
  );
  if (!exerciseSetCounts) {
    return null;
  }

  const plan: TrainingPlan = {
    id: value.id,
    name: value.name,
    durationWeeks,
    currentWeek,
    currentDay,
    exerciseSetCounts,
    schedule,
  };

  if (value.advanced !== undefined) {
    if (
      !isObject(value.advanced) ||
      typeof value.advanced.autoIncrement !== 'boolean'
    ) {
      return null;
    }

    plan.advanced = { autoIncrement: value.advanced.autoIncrement };
  }

  if (value.deload !== undefined) {
    const deload = normalizePlanDeload(value.deload, durationWeeks);
    if (!deload) {
      return null;
    }

    plan.deload = deload;
  }

  return plan;
};

const normalizePlans = (value: unknown): TrainingPlan[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const plans: TrainingPlan[] = [];
  for (const item of value) {
    const plan = normalizePlan(item);
    if (!plan) {
      return null;
    }
    plans.push(plan);
  }

  return plans;
};

export const normalizeSettings = (value: unknown): Settings | null => {
  if (
    !isObject(value) ||
    (value.unit !== 'lbs' && value.unit !== 'kg') ||
    typeof value.hapticFeedback !== 'boolean' ||
    typeof value.matchWeight !== 'boolean'
  ) {
    return null;
  }

  return {
    unit: value.unit,
    hapticFeedback: value.hapticFeedback,
    matchWeight: value.matchWeight,
  };
};

export const parseStoredValue = <T>(
  raw: string | null,
  normalize: (value: unknown) => T | null,
  fallback: T
): T => {
  if (!raw) {
    return fallback;
  }

  try {
    const normalized = normalize(JSON.parse(raw));
    return normalized ?? fallback;
  } catch {
    return fallback;
  }
};

export const parseStoredString = (
  raw: string | null,
  fallback: string | null
): string | null => {
  return typeof raw === 'string' ? raw : fallback;
};

export const validateImportedBackup = (
  value: unknown
): ImportValidationResult => {
  if (!isObject(value)) {
    return { ok: false, error: 'INVALID BACKUP FILE: expected an object' };
  }

  const exercises = normalizeExercises(value.exercises);
  if (!exercises) {
    return { ok: false, error: 'INVALID BACKUP FILE: exercises are malformed' };
  }

  const plans = normalizePlans(value.plans);
  if (!plans) {
    return { ok: false, error: 'INVALID BACKUP FILE: plans are malformed' };
  }

  const settings = normalizeSettings(value.settings);
  if (!settings) {
    return { ok: false, error: 'INVALID BACKUP FILE: settings are malformed' };
  }

  let prs: PR[] = [];
  if (value.prs !== undefined) {
    const normalizedPrs = normalizePrs(value.prs);
    if (!normalizedPrs) {
      return { ok: false, error: 'INVALID BACKUP FILE: PR history is malformed' };
    }
    prs = normalizedPrs;
  }

  let activePlanId: string | null = null;
  if (value.activePlanId !== undefined && value.activePlanId !== null) {
    if (typeof value.activePlanId !== 'string') {
      return { ok: false, error: 'INVALID BACKUP FILE: active plan is malformed' };
    }
    activePlanId = value.activePlanId;
  }

  if (activePlanId && !plans.some((plan) => plan.id === activePlanId)) {
    activePlanId = null;
  }

  return {
    ok: true,
    value: {
      exercises,
      prs,
      plans,
      activePlanId,
      settings,
    },
  };
};

export const parseImportedBackupFile = (
  raw: string
): ImportValidationResult => {
  try {
    return validateImportedBackup(JSON.parse(raw));
  } catch {
    return { ok: false, error: 'INVALID BACKUP FILE' };
  }
};

export const normalizeExercisesForStorage = (value: unknown): Exercise[] | null =>
  normalizeExercises(value);

export const normalizePrsForStorage = (value: unknown): PR[] | null =>
  normalizePrs(value);

export const normalizePlansForStorage = (value: unknown): TrainingPlan[] | null =>
  normalizePlans(value);
