import {
  DEFAULT_PRIMARY_MUSCLE_GROUP,
  type PrimaryMuscleGroup,
} from './exercise-tags.ts';

export interface PlanEditorDay {
  type: 'workout' | 'rest';
  exercises: string[];
  description: string;
}

export interface PlanExerciseOption {
  name: string;
  primaryMuscle: PrimaryMuscleGroup;
}

export interface PlanExerciseDraft {
  name: string;
  primaryMuscle: PrimaryMuscleGroup;
}

const DEFAULT_WORKOUT_DESCRIPTION = 'ASSIGN ROUTINE';

export const normalizePlanExerciseName = (value: string) => value.trim().toUpperCase();

export const buildWorkoutDescription = (exercises: string[]) =>
  exercises.length > 0 ? exercises.join(', ') : DEFAULT_WORKOUT_DESCRIPTION;

export const addExerciseToPlanDay = (day: PlanEditorDay, value: string): PlanEditorDay => {
  const exerciseName = normalizePlanExerciseName(value);

  if (!exerciseName) {
    return day;
  }

  const exercises = [...day.exercises, exerciseName];

  return {
    ...day,
    exercises,
    description: buildWorkoutDescription(exercises),
  };
};

export const removeExerciseFromPlanDay = (day: PlanEditorDay, index: number): PlanEditorDay => {
  const exercises = day.exercises.filter((_, exerciseIndex) => exerciseIndex !== index);

  return {
    ...day,
    exercises,
    description: buildWorkoutDescription(exercises),
  };
};

export const buildPlanExerciseDraft = (
  existingExercises: PlanExerciseOption[],
  value: string,
  primaryMuscle: PrimaryMuscleGroup = DEFAULT_PRIMARY_MUSCLE_GROUP
): PlanExerciseDraft | null => {
  const name = normalizePlanExerciseName(value);
  if (!name) {
    return null;
  }

  const existingExercise = existingExercises.find(
    (exercise) => normalizePlanExerciseName(exercise.name) === name
  );

  return {
    name,
    primaryMuscle: existingExercise?.primaryMuscle ?? primaryMuscle,
  };
};

export const getPlanExerciseSuggestions = (existingExercises: PlanExerciseOption[], value: string) => {
  const normalizedInput = normalizePlanExerciseName(value);

  if (!normalizedInput) {
    return [];
  }

  return existingExercises.filter((exercise) => {
    const normalizedExercise = normalizePlanExerciseName(exercise.name);
    return (
      normalizedExercise.includes(normalizedInput) &&
      normalizedExercise !== normalizedInput
    );
  });
};
