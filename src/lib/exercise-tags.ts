export const PRIMARY_MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Quads',
  'Hamstrings',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Glutes',
  'Core',
  'Other',
] as const;

export type PrimaryMuscleGroup = (typeof PRIMARY_MUSCLE_GROUPS)[number];

export const DEFAULT_PRIMARY_MUSCLE_GROUP: PrimaryMuscleGroup = 'Other';

export const isPrimaryMuscleGroup = (value: unknown): value is PrimaryMuscleGroup =>
  typeof value === 'string' &&
  PRIMARY_MUSCLE_GROUPS.includes(value as PrimaryMuscleGroup);

export const normalizePrimaryMuscleGroup = (
  value: unknown
): PrimaryMuscleGroup =>
  isPrimaryMuscleGroup(value) ? value : DEFAULT_PRIMARY_MUSCLE_GROUP;
