import type { PR } from '../types';

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
