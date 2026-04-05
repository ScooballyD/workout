import type { Exercise, PR } from '../types';
import {
  PRIMARY_MUSCLE_GROUPS,
  normalizePrimaryMuscleGroup,
  type PrimaryMuscleGroup,
} from './exercise-tags.ts';

export const ALL_PR_FILTER = 'ALL';

const getMinimumVisibleRange = (maxWeight: number) => {
  if (maxWeight <= 25) {
    return 2;
  }

  if (maxWeight <= 100) {
    return 5;
  }

  if (maxWeight <= 250) {
    return 10;
  }

  return 20;
};

const normalizeFilterLabel = (value: string) => value.trim();

const normalizeFilterKey = (value: string) => normalizeFilterLabel(value).toUpperCase();

const getMuscleGroupFilters = (filters: string[]) =>
  filters.filter(filter => normalizeFilterKey(filter) !== ALL_PR_FILTER);

const normalizeSelection = (selectedFilters: string[], availableFilters: string[]) => {
  const normalized = new Set<string>();
  const availableByKey = new Map(
    availableFilters
      .filter(filter => normalizeFilterKey(filter) !== ALL_PR_FILTER)
      .map(filter => [normalizeFilterKey(filter), filter])
  );

  for (const filter of selectedFilters) {
    const normalizedFilter = availableByKey.get(normalizeFilterKey(filter));
    if (!normalizedFilter) {
      continue;
    }

    normalized.add(normalizeFilterKey(normalizedFilter));
  }

  return normalized;
};

const buildExerciseLookup = (exercises: Exercise[]) => {
  const byId = new Map<string, PrimaryMuscleGroup>();
  const byName = new Map<string, PrimaryMuscleGroup>();

  for (const exercise of exercises) {
    const muscleGroup = normalizePrimaryMuscleGroup(exercise.primaryMuscle);
    byId.set(exercise.id, muscleGroup);
    byName.set(exercise.name.trim().toUpperCase(), muscleGroup);
  }

  return { byId, byName };
};

const resolvePrMuscleGroup = (
  pr: PR,
  exerciseLookup: ReturnType<typeof buildExerciseLookup>
) => {
  const byId = exerciseLookup.byId.get(pr.exerciseId);
  if (byId) {
    return byId;
  }

  const byName = exerciseLookup.byName.get(pr.exerciseName.trim().toUpperCase());
  if (byName) {
    return byName;
  }

  return normalizePrimaryMuscleGroup(undefined);
};

export const getPrFilterOptions = (prs: PR[], exercises: Exercise[]) => {
  const seen = new Set<PrimaryMuscleGroup>();
  const exerciseLookup = buildExerciseLookup(exercises);

  for (const pr of prs) {
    const muscleGroup = resolvePrMuscleGroup(pr, exerciseLookup);
    if (seen.has(muscleGroup)) {
      continue;
    }

    seen.add(muscleGroup);
  }

  return [ALL_PR_FILTER, ...PRIMARY_MUSCLE_GROUPS.filter(group => seen.has(group))];
};

export const filterPrsByMuscleGroup = (
  prs: PR[],
  selectedFilters: string[],
  exercises: Exercise[]
) => {
  if (selectedFilters.length === 0) {
    return [];
  }

  const exerciseLookup = buildExerciseLookup(exercises);
  const normalizedSelection = normalizeSelection(
    selectedFilters,
    getMuscleGroupFilters(getPrFilterOptions(prs, exercises))
  );

  return prs.filter(pr =>
    normalizedSelection.has(normalizeFilterKey(resolvePrMuscleGroup(pr, exerciseLookup)))
  );
};

export const getPrChartDomain = (history: PR['history']) => {
  if (history.length === 0) {
    return {
      min: 0,
      max: 0,
      domain: [0, 1] as [number, number],
    };
  }

  let min = history[0].weight;
  let max = history[0].weight;

  for (const entry of history) {
    if (entry.weight < min) {
      min = entry.weight;
    }

    if (entry.weight > max) {
      max = entry.weight;
    }
  }

  const range = max - min;
  const minimumVisibleRange = getMinimumVisibleRange(max);
  const effectiveRange = Math.max(range, minimumVisibleRange);
  const padding = Math.max(effectiveRange * 0.2, minimumVisibleRange * 0.25);
  const center = (min + max) / 2;

  let domainMin = center - (effectiveRange / 2 + padding);
  let domainMax = center + (effectiveRange / 2 + padding);

  if (domainMin < 0) {
    domainMax -= domainMin;
    domainMin = 0;
  }

  return {
    min,
    max,
    domain: [domainMin, domainMax] as [number, number],
  };
};

export const togglePrExerciseFilter = (
  selectedFilters: string[],
  filter: string,
  availableFilters: string[],
) => {
  const workoutFilters = getMuscleGroupFilters(availableFilters);
  const normalizedSelection = normalizeSelection(selectedFilters, workoutFilters);
  const normalizedFilter = normalizeFilterKey(filter);

  if (normalizedFilter === ALL_PR_FILTER) {
    if (workoutFilters.length > 0 && normalizedSelection.size === workoutFilters.length) {
      return [];
    }

    return workoutFilters;
  }

  if (!workoutFilters.some(option => normalizeFilterKey(option) === normalizedFilter)) {
    return workoutFilters.filter(option => normalizedSelection.has(normalizeFilterKey(option)));
  }

  if (normalizedSelection.has(normalizedFilter)) {
    normalizedSelection.delete(normalizedFilter);
    return workoutFilters.filter(option => normalizedSelection.has(normalizeFilterKey(option)));
  }

  normalizedSelection.add(normalizedFilter);
  return workoutFilters.filter(option => normalizedSelection.has(normalizeFilterKey(option)));
};
