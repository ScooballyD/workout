import type { Exercise, PR, TrainingPlan } from '../types.ts';
import {
  normalizePrimaryMuscleGroup,
  type PrimaryMuscleGroup,
} from './exercise-tags.ts';
import {
  buildPlanExerciseSetCounts,
  normalizePlanExerciseName,
} from './plans.ts';

type ExerciseManagementState = {
  exercises: Exercise[];
  plans: TrainingPlan[];
  prs: PR[];
};

type SaveManagedExerciseEditsArgs = ExerciseManagementState & {
  exerciseId: string;
  nextName: string;
  nextPrimaryMuscle: PrimaryMuscleGroup;
};

type SaveManagedExerciseEditsResult =
  | ({ ok: true } & ExerciseManagementState)
  | {
      ok: false;
      error: string;
    };

const formatManagedExerciseName = (value: string) => value.trim().toUpperCase();

const renamePlanScheduleExercises = (
  schedule: TrainingPlan['schedule'],
  previousName: string,
  nextName: string
): TrainingPlan['schedule'] =>
  Object.fromEntries(
    Object.entries(schedule).map(([day, entry]) => {
      if (!entry.exercises) {
        return [day, entry];
      }

      return [
        day,
        {
          ...entry,
          exercises: entry.exercises.map((exerciseName) =>
            normalizePlanExerciseName(exerciseName) ===
            normalizePlanExerciseName(previousName)
              ? nextName
              : exerciseName
          ),
        },
      ];
    })
  ) as TrainingPlan['schedule'];

const removeExerciseFromPlanSchedule = (
  schedule: TrainingPlan['schedule'],
  exerciseName: string
): TrainingPlan['schedule'] =>
  Object.fromEntries(
    Object.entries(schedule).map(([day, entry]) => {
      if (!entry.exercises) {
        return [day, entry];
      }

      return [
        day,
        {
          ...entry,
          exercises: entry.exercises.filter(
            (scheduledExerciseName) =>
              normalizePlanExerciseName(scheduledExerciseName) !==
              normalizePlanExerciseName(exerciseName)
          ),
        },
      ];
    })
  ) as TrainingPlan['schedule'];

const renameExerciseSetCountKey = (
  exerciseSetCounts: TrainingPlan['exerciseSetCounts'],
  previousName: string,
  nextName: string
): TrainingPlan['exerciseSetCounts'] => {
  if (!exerciseSetCounts) {
    return exerciseSetCounts;
  }

  const normalizedPreviousName = normalizePlanExerciseName(previousName);
  const renamedCounts: Record<string, number> = {};

  for (const [exerciseName, count] of Object.entries(exerciseSetCounts)) {
    const normalizedExerciseName = normalizePlanExerciseName(exerciseName);
    renamedCounts[
      normalizedExerciseName === normalizedPreviousName
        ? normalizePlanExerciseName(nextName)
        : normalizedExerciseName
    ] = count;
  }

  return renamedCounts;
};

export const saveManagedExerciseEdits = ({
  exercises,
  plans,
  prs,
  exerciseId,
  nextName,
  nextPrimaryMuscle,
}: SaveManagedExerciseEditsArgs): SaveManagedExerciseEditsResult => {
  const targetExercise = exercises.find((exercise) => exercise.id === exerciseId);

  if (!targetExercise) {
    return {
      ok: false,
      error: 'EXERCISE NOT FOUND',
    };
  }

  const formattedName = formatManagedExerciseName(nextName);

  if (!formattedName) {
    return {
      ok: false,
      error: 'ENTER AN EXERCISE NAME',
    };
  }

  const duplicateExists = exercises.some(
    (exercise) =>
      exercise.id !== exerciseId &&
      normalizePlanExerciseName(exercise.name) ===
        normalizePlanExerciseName(formattedName)
  );

  if (duplicateExists) {
    return {
      ok: false,
      error: 'AN EXERCISE WITH THAT NAME ALREADY EXISTS',
    };
  }

  const previousName = targetExercise.name;
  const normalizedPrimaryMuscle =
    normalizePrimaryMuscleGroup(nextPrimaryMuscle);

  const nextExercises = exercises.map((exercise) =>
    exercise.id === exerciseId
      ? {
          ...exercise,
          name: formattedName,
          primaryMuscle: normalizedPrimaryMuscle,
        }
      : exercise
  );

  const nextPlans = plans.map((plan) => {
    const nextExerciseSetCounts = renameExerciseSetCountKey(
      plan.exerciseSetCounts,
      previousName,
      formattedName
    );
    const nextSchedule = renamePlanScheduleExercises(
      plan.schedule,
      previousName,
      formattedName
    );

    return {
      ...plan,
      schedule: nextSchedule,
      exerciseSetCounts: buildPlanExerciseSetCounts(
        nextSchedule,
        nextExerciseSetCounts
      ),
    };
  });

  const nextPrs = prs.map((pr) =>
    pr.exerciseId === exerciseId ? { ...pr, exerciseName: formattedName } : pr
  );

  return {
    ok: true,
    exercises: nextExercises,
    plans: nextPlans,
    prs: nextPrs,
  };
};

export const deleteManagedExercise = ({
  exercises,
  plans,
  prs,
  exerciseId,
}: ExerciseManagementState & { exerciseId: string }): ExerciseManagementState => {
  const targetExercise = exercises.find((exercise) => exercise.id === exerciseId);

  if (!targetExercise) {
    return {
      exercises,
      plans,
      prs,
    };
  }

  const nextExercises = exercises.filter((exercise) => exercise.id !== exerciseId);
  const nextPlans = plans.map((plan) => {
    const nextSchedule = removeExerciseFromPlanSchedule(
      plan.schedule,
      targetExercise.name
    );

    return {
      ...plan,
      schedule: nextSchedule,
      exerciseSetCounts: buildPlanExerciseSetCounts(
        nextSchedule,
        plan.exerciseSetCounts
      ),
    };
  });
  const nextPrs = prs.filter((pr) => pr.exerciseId !== exerciseId);

  return {
    exercises: nextExercises,
    plans: nextPlans,
    prs: nextPrs,
  };
};
