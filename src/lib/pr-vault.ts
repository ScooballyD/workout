import type { PR } from '../types';

export const ALL_PR_FILTER = 'ALL';

const normalizeExerciseName = (value: string) => value.trim().toUpperCase();

const getWorkoutFilters = (filters: string[]) => filters.filter(filter => normalizeExerciseName(filter) !== ALL_PR_FILTER);

const normalizeSelection = (selectedFilters: string[]) => {
  const normalized = new Set<string>();

  for (const filter of selectedFilters) {
    const normalizedFilter = normalizeExerciseName(filter);
    if (!normalizedFilter || normalizedFilter === ALL_PR_FILTER) {
      continue;
    }

    normalized.add(normalizedFilter);
  }

  return normalized;
};

export const getPrFilterOptions = (prs: PR[]) => {
  const seen = new Set<string>();
  const filters = [ALL_PR_FILTER];

  for (const pr of prs) {
    const normalizedName = normalizeExerciseName(pr.exerciseName);
    if (!normalizedName || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    filters.push(pr.exerciseName);
  }

  return filters;
};

export const filterPrsByExercise = (prs: PR[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) {
    return [];
  }

  const normalizedSelection = normalizeSelection(selectedFilters);
  return prs.filter(pr => normalizedSelection.has(normalizeExerciseName(pr.exerciseName)));
};

export const togglePrExerciseFilter = (
  selectedFilters: string[],
  filter: string,
  availableFilters: string[],
) => {
  const workoutFilters = getWorkoutFilters(availableFilters);
  const normalizedSelection = normalizeSelection(selectedFilters);
  const normalizedFilter = normalizeExerciseName(filter);

  if (normalizedFilter === ALL_PR_FILTER) {
    if (workoutFilters.length > 0 && normalizedSelection.size === workoutFilters.length) {
      return [];
    }

    return workoutFilters;
  }

  if (!workoutFilters.some(option => normalizeExerciseName(option) === normalizedFilter)) {
    return Array.from(normalizedSelection);
  }

  if (normalizedSelection.has(normalizedFilter)) {
    normalizedSelection.delete(normalizedFilter);
    return workoutFilters.filter(option => normalizedSelection.has(normalizeExerciseName(option)));
  }

  normalizedSelection.add(normalizedFilter);
  return workoutFilters.filter(option => normalizedSelection.has(normalizeExerciseName(option)));
};
