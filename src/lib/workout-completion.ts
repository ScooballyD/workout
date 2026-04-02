import type { Exercise } from '../types.ts';

export const completeWorkoutExercises = (
  exercises: Exercise[],
  todayExerciseNames: string[]
): Exercise[] =>
  exercises.map((exercise) => {
    const wasInToday = todayExerciseNames.includes(exercise.name);
    if (!wasInToday) {
      return exercise;
    }

    return {
      ...exercise,
      lastLogs:
        exercise.logs.length > 0
          ? exercise.logs.map((log) => (log?.completed ? { ...log } : undefined))
          : exercise.lastLogs,
      logs: [],
    };
  });
