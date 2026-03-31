export interface SetLog {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  logs: SetLog[];
  lastLogs?: SetLog[];
  recommended?: {
    weight: number;
    reps: number;
  };
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  durationWeeks: number;
  currentWeek: number;
  currentDay: number;
  schedule: {
    [day: string]: {
      type: 'workout' | 'rest';
      workoutId?: string;
      exercises?: string[];
      description?: string; // Keeping for backward compatibility if needed, but will use exercises
    };
  };
  advanced?: {
    autoIncrement: boolean;
    rpeTracking: boolean;
  };
}

export interface PR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  date: string;
  history: { weight: number; date: string }[];
}

export interface Settings {
  unit: 'lbs' | 'kg';
  hapticFeedback: boolean;
  matchWeight: boolean;
}
