import type { Exercise, PR, Settings, SetLog, TrainingPlan } from '../types';
import { normalizePrimaryMuscleGroup } from './exercise-tags.ts';
import {
  buildPlanExerciseSetCounts,
  normalizePlanExerciseName,
} from './plans.ts';
import {
  DATA_LIMITS,
  getUtf8ByteLength,
  isBoundedArray,
  isBoundedText,
  isSafeIntegerInRange,
} from './data-limits.ts';

const PLAN_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lbs',
  hapticFeedback: true,
  matchWeight: true,
  includeRestDays: false,
};

export type ImportedBackupData = {
  exercises: Exercise[];
  prs: PR[];
  plans: TrainingPlan[];
  activePlanId: string | null;
  settings: Settings;
};

export type ImportValidationResult =
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

const isBoundedPositiveInteger = (value: unknown, maximum: number): value is number =>
  isSafeIntegerInRange(value, 1, maximum);

const isScheduledExerciseArray = (value: unknown): value is string[] =>
  isBoundedArray<string>(value, DATA_LIMITS.maxScheduledExercisesPerDay) &&
  value.every((item) => isBoundedText(item, DATA_LIMITS.maxTextLength));

const isSetLog = (value: unknown): value is SetLog =>
  isObject(value) &&
  isFiniteNumber(value.weight) &&
  isFiniteNumber(value.reps) &&
  typeof value.completed === 'boolean';

const normalizeLogArray = (value: unknown): Array<SetLog | undefined> | null => {
  if (!isBoundedArray(value, DATA_LIMITS.maxLogsPerExercise)) {
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
    !isBoundedText(value.id, DATA_LIMITS.maxIdentifierLength) ||
    !isBoundedText(value.name, DATA_LIMITS.maxTextLength) ||
    !isBoundedPositiveInteger(sets, DATA_LIMITS.maxSetsPerExercise) ||
    !isBoundedText(value.reps, DATA_LIMITS.maxTextLength) ||
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
  if (!isBoundedArray(value, DATA_LIMITS.maxExercises)) {
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
  isBoundedText(value.date, DATA_LIMITS.maxDateLength);

const normalizePr = (value: unknown): PR | null => {
  if (
    !isObject(value) ||
    !isBoundedText(value.exerciseId, DATA_LIMITS.maxIdentifierLength) ||
    !isBoundedText(value.exerciseName, DATA_LIMITS.maxTextLength) ||
    !isFiniteNumber(value.weight) ||
    !isBoundedText(value.date, DATA_LIMITS.maxDateLength) ||
    !isBoundedArray(value.history, DATA_LIMITS.maxPrHistoryEntries) ||
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
  if (!isBoundedArray(value, DATA_LIMITS.maxPrRecords)) {
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
  if (
    workoutId !== undefined &&
    !isBoundedText(workoutId, DATA_LIMITS.maxIdentifierLength)
  ) {
    return null;
  }

  const exercises = value.exercises;
  if (exercises !== undefined && !isScheduledExerciseArray(exercises)) {
    return null;
  }

  const description = value.description;
  if (
    description !== undefined &&
    !isBoundedText(description, DATA_LIMITS.maxTextLength)
  ) {
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

  const exerciseNames = Object.keys(value);
  if (exerciseNames.length > DATA_LIMITS.maxPlanExerciseSetCountEntries) {
    return null;
  }

  const counts: Record<string, number> = {};
  for (const exerciseName of exerciseNames) {
    const count = value[exerciseName];
    if (
      !isBoundedText(exerciseName, DATA_LIMITS.maxTextLength) ||
      !isBoundedPositiveInteger(count, DATA_LIMITS.maxSetsPerExercise)
    ) {
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

  if (
    value.enabled !== true ||
    !isBoundedPositiveInteger(value.baseDurationWeeks, DATA_LIMITS.maxPlanWeeks)
  ) {
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
    !isBoundedText(value.id, DATA_LIMITS.maxIdentifierLength) ||
    !isBoundedText(value.name, DATA_LIMITS.maxTextLength) ||
    !isBoundedPositiveInteger(value.durationWeeks, DATA_LIMITS.maxPlanWeeks)
  ) {
    return null;
  }

  const durationWeeks = value.durationWeeks;
  const currentWeek = value.currentWeek;
  const currentDay = value.currentDay;
  if (
    !isBoundedPositiveInteger(currentWeek, durationWeeks + 1) ||
    !isBoundedPositiveInteger(currentDay, durationWeeks * 7 + 1)
  ) {
    return null;
  }
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
  if (!isBoundedArray(value, DATA_LIMITS.maxPlans)) {
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
  const includeRestDays = isObject(value) ? value.includeRestDays : undefined;

  if (
    !isObject(value) ||
    (value.unit !== 'lbs' && value.unit !== 'kg') ||
    typeof value.hapticFeedback !== 'boolean' ||
    typeof value.matchWeight !== 'boolean' ||
    (includeRestDays !== undefined && typeof includeRestDays !== 'boolean')
  ) {
    return null;
  }

  return {
    unit: value.unit,
    hapticFeedback: value.hapticFeedback,
    matchWeight: value.matchWeight,
    includeRestDays: typeof includeRestDays === 'boolean' ? includeRestDays : false,
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
    if (!isBoundedText(value.activePlanId, DATA_LIMITS.maxIdentifierLength)) {
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
  if (getUtf8ByteLength(raw) > DATA_LIMITS.maxBackupBytes) {
    return {
      ok: false,
      error: 'INVALID BACKUP FILE: file exceeds 2 MiB limit',
    };
  }

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
