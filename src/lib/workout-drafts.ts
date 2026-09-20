import {
  shouldPersistExerciseLogInputValue,
  type ExerciseLogInputSource,
  type ExerciseLogInputValue,
} from './exercise-log-inputs.ts';

export const WORKOUT_DRAFTS_STORAGE_KEY = 'workout_drafts';
const WORKOUT_DRAFTS_VERSION = 1;

export interface WorkoutDraftContext {
  planId: string;
  planDay: number;
  exerciseId: string;
  setIndex: number;
}

export interface WorkoutDraft extends WorkoutDraftContext, ExerciseLogInputValue {}

export type WorkoutDrafts = Record<string, WorkoutDraft>;

const INPUT_SOURCES: ExerciseLogInputSource[] = [
  'default',
  'manual',
  'propagated',
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

const isNonNegativeFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isInputSource = (value: unknown): value is ExerciseLogInputSource =>
  typeof value === 'string' && INPUT_SOURCES.includes(value as ExerciseLogInputSource);

const normalizeWorkoutDraft = (value: unknown): WorkoutDraft | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<WorkoutDraft>;
  if (
    !isNonEmptyString(candidate.planId) ||
    !isNonNegativeInteger(candidate.planDay) ||
    !isNonEmptyString(candidate.exerciseId) ||
    !isNonNegativeInteger(candidate.setIndex) ||
    !isNonNegativeFiniteNumber(candidate.weight) ||
    !isNonNegativeFiniteNumber(candidate.reps) ||
    !isInputSource(candidate.weightSource) ||
    !isInputSource(candidate.repsSource)
  ) {
    return null;
  }

  const normalized = {
    planId: candidate.planId,
    planDay: candidate.planDay,
    exerciseId: candidate.exerciseId,
    setIndex: candidate.setIndex,
    weight: candidate.weight,
    reps: candidate.reps,
    weightSource: candidate.weightSource,
    repsSource: candidate.repsSource,
  };

  return shouldPersistExerciseLogInputValue(normalized) ? normalized : null;
};

export const createWorkoutDraftKey = (context: WorkoutDraftContext): string =>
  JSON.stringify([
    context.planId,
    context.planDay,
    context.exerciseId,
    context.setIndex,
  ]);

export const parseWorkoutDrafts = (raw: string | null): WorkoutDrafts => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as { version?: unknown; drafts?: unknown };
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== WORKOUT_DRAFTS_VERSION ||
      !Array.isArray(parsed.drafts)
    ) {
      return {};
    }

    return parsed.drafts.reduce<WorkoutDrafts>((drafts, value) => {
      const normalized = normalizeWorkoutDraft(value);
      if (normalized) {
        drafts[createWorkoutDraftKey(normalized)] = normalized;
      }
      return drafts;
    }, {});
  } catch {
    return {};
  }
};

export const serializeWorkoutDrafts = (drafts: WorkoutDrafts): string =>
  JSON.stringify({
    version: WORKOUT_DRAFTS_VERSION,
    drafts: Object.values(drafts),
  });

export const getWorkoutDraft = (
  drafts: WorkoutDrafts,
  context: WorkoutDraftContext
): WorkoutDraft | undefined => drafts[createWorkoutDraftKey(context)];

export const upsertWorkoutDraft = (
  drafts: WorkoutDrafts,
  draft: WorkoutDraft
): WorkoutDrafts => {
  const normalized = normalizeWorkoutDraft(draft);
  if (!normalized) {
    return drafts;
  }

  return {
    ...drafts,
    [createWorkoutDraftKey(normalized)]: normalized,
  };
};

export const removeWorkoutDraft = (
  drafts: WorkoutDrafts,
  context: WorkoutDraftContext
): WorkoutDrafts => {
  const key = createWorkoutDraftKey(context);
  if (!(key in drafts)) {
    return drafts;
  }

  const nextDrafts = { ...drafts };
  delete nextDrafts[key];
  return nextDrafts;
};

const removeMatchingDrafts = (
  drafts: WorkoutDrafts,
  shouldRemove: (draft: WorkoutDraft) => boolean
): WorkoutDrafts => {
  const entries = Object.entries(drafts).filter(([, draft]) => !shouldRemove(draft));
  return entries.length === Object.keys(drafts).length
    ? drafts
    : Object.fromEntries(entries);
};

export const removeWorkoutDraftsForPlan = (
  drafts: WorkoutDrafts,
  planId: string
): WorkoutDrafts => removeMatchingDrafts(drafts, (draft) => draft.planId === planId);

export const removeWorkoutDraftsForExercise = (
  drafts: WorkoutDrafts,
  exerciseId: string
): WorkoutDrafts =>
  removeMatchingDrafts(drafts, (draft) => draft.exerciseId === exerciseId);

export const pruneWorkoutDrafts = (
  drafts: WorkoutDrafts,
  validContexts: WorkoutDraftContext[]
): WorkoutDrafts => {
  const validKeys = new Set(validContexts.map(createWorkoutDraftKey));
  return removeMatchingDrafts(
    drafts,
    (draft) => !validKeys.has(createWorkoutDraftKey(draft))
  );
};

export const convertWorkoutDraftWeights = (
  drafts: WorkoutDrafts,
  convert: (weight: number) => number
): WorkoutDrafts =>
  Object.fromEntries(
    Object.entries(drafts).map(([key, draft]) => [
      key,
      { ...draft, weight: convert(draft.weight) },
    ])
  );
