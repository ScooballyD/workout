export interface PlanEditorDay {
  type: 'workout' | 'rest';
  exercises: string[];
  description: string;
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

export const getPlanExerciseSuggestions = (existingExercises: string[], value: string) => {
  const normalizedInput = normalizePlanExerciseName(value);

  if (!normalizedInput) {
    return [];
  }

  return existingExercises.filter((exercise) => {
    const normalizedExercise = exercise.toUpperCase();
    return (
      normalizedExercise.includes(normalizedInput) &&
      normalizedExercise !== normalizedInput
    );
  });
};
