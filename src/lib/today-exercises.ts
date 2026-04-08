import type { Exercise } from '../types.ts';

export const buildTodayExercises = (
  scheduledExerciseNames: string[],
  exercises: Exercise[]
) => {
  const seen = new Set<string>();

  return scheduledExerciseNames
    .filter((exerciseName) => {
      if (seen.has(exerciseName)) {
        return false;
      }

      seen.add(exerciseName);
      return true;
    })
    .map((exerciseName) =>
      exercises.find((exercise) => exercise.name === exerciseName)
    )
    .filter((exercise): exercise is Exercise => Boolean(exercise));
};
