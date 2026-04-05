import { Exercise, PR } from "./types";

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: "1",
    name: "BENCH PRESS",
    primaryMuscle: "Chest",
    sets: 5,
    reps: "5-8",
    logs: [],
    recommended: { weight: 225, reps: 5 }
  },
  {
    id: "2",
    name: "INCLINE DUMBBELL PRESS",
    primaryMuscle: "Chest",
    sets: 4,
    reps: "8-10",
    logs: [],
    recommended: { weight: 80, reps: 10 }
  },
  {
    id: "3",
    name: "PEC DECK FLY",
    primaryMuscle: "Chest",
    sets: 3,
    reps: "12-15",
    logs: [],
    recommended: { weight: 150, reps: 12 }
  },
  {
    id: "4",
    name: "TRICEP PUSHDOWN",
    primaryMuscle: "Triceps",
    sets: 4,
    reps: "10-12",
    logs: [],
    recommended: { weight: 70, reps: 12 }
  }
];

export const INITIAL_PRS: PR[] = [];
