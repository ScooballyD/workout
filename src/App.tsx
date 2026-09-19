/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Calendar, 
  Trophy, 
  Settings as SettingsIcon, 
  Bolt, 
  ArrowLeft, 
  Plus, 
  Check, 
  Download, 
  RefreshCw, 
  Trash2,
  Pencil,
  RotateCcw,
  ChevronRight,
  Lock
} from 'lucide-react';
import { Header } from './components/Header';
import { cn } from './lib/utils';
import {
  DEFAULT_SETTINGS,
  type ImportedBackupData,
  parseImportedBackupFile,
  normalizeExercisesForStorage,
  normalizePlansForStorage,
  normalizePrsForStorage,
  normalizeSettings,
  parseStoredString,
  parseStoredValue,
} from './lib/backup';
import { createId } from './lib/id';
import { getNextIncompleteSetIndex } from './lib/exercise-progress';
import {
  applyRepsChangeToInputs,
  applyWeightChangeToInputs,
  createExerciseLogInputValues,
  syncExerciseLogInputValues,
  type ExerciseLogInputValue,
} from './lib/exercise-log-inputs';
import { getNextSetDisplayValues, getNextSetInfo } from './lib/next-set-info';
import { getLocalCalendarDateString } from './lib/local-date';
import { getAndroidBackAction } from './lib/android-back';
import { applyWorkoutPrUpdates } from './lib/pr-vault';
import {
  addExerciseToPlanDay,
  buildPlanExerciseDraft,
  getPlanExerciseSuggestions,
  removeExerciseFromPlanDay,
  type PlanExerciseOption,
} from './lib/plan-editor';
import { advancePlanProgress, getPlanProgressSnapshot, isPlanComplete } from './lib/plan-progress';
import { getPlanExerciseSetCount, isDeloadWeek } from './lib/deload.ts';
import {
  buildPlanExerciseSetCounts,
  deletePlanById,
  mergePlanEdits,
  normalizePlanExerciseName,
  replacePlanById,
  restartPlanProgress,
} from './lib/plans.ts';
import {
  deleteManagedExercise,
  saveManagedExerciseEdits,
} from './lib/exercise-management.ts';
import { buildTodayExercises } from './lib/today-exercises.ts';
import { completeWorkoutExercises } from './lib/workout-completion';
import { Exercise, PR, TrainingPlan, Settings, SetLog } from './types';
import { INITIAL_EXERCISES, INITIAL_PRS } from './constants';
import {
  DEFAULT_PRIMARY_MUSCLE_GROUP,
  PRIMARY_MUSCLE_GROUPS,
  type PrimaryMuscleGroup,
} from './lib/exercise-tags.ts';

const PRVaultPage = React.lazy(() => import('./pages/PRVault'));

const PLAN_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

type PlanEditorDay = {
  type: 'workout' | 'rest';
  exercises: string[];
  description: string;
};

const DEFAULT_PLAN_EDITOR_SCHEDULE: Record<string, PlanEditorDay> = {
  MON: { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
  TUE: { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
  WED: { type: 'rest', exercises: [], description: 'RECOVERY & MOBILITY' },
  THU: { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
  FRI: { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
  SAT: { type: 'rest', exercises: [], description: 'ACTIVE RECOVERY' },
  SUN: { type: 'rest', exercises: [], description: 'REST DAY' },
};

const createPlanEditorSchedule = (
  plan?: TrainingPlan
): Record<string, PlanEditorDay> =>
  PLAN_DAYS.reduce<Record<string, PlanEditorDay>>((schedule, day) => {
    const baseDay = DEFAULT_PLAN_EDITOR_SCHEDULE[day];
    const savedDay = plan?.schedule[day];

    schedule[day] = {
      type: savedDay?.type ?? baseDay.type,
      exercises: [...(savedDay?.exercises ?? baseDay.exercises)],
      description: savedDay?.description ?? baseDay.description,
    };

    return schedule;
  }, {});

const formatMuscleGroupLabel = (group: PrimaryMuscleGroup) =>
  group === 'Other' ? 'ACCESSORY' : group.toUpperCase();

const buildPlanFocusSummary = (
  schedule: Record<string, PlanEditorDay>,
  exercisePrimaryMuscles: Record<string, PrimaryMuscleGroup>
) => {
  const counts = PRIMARY_MUSCLE_GROUPS.reduce<Record<PrimaryMuscleGroup, number>>(
    (accumulator, group) => {
      accumulator[group] = 0;
      return accumulator;
    },
    {} as Record<PrimaryMuscleGroup, number>
  );
  let totalExercises = 0;

  Object.values(schedule).forEach((day) => {
    if (day.type !== 'workout') {
      return;
    }

    day.exercises.forEach((exerciseName) => {
      const normalizedName = normalizePlanExerciseName(exerciseName);
      const primaryMuscle =
        exercisePrimaryMuscles[normalizedName] ?? DEFAULT_PRIMARY_MUSCLE_GROUP;

      counts[primaryMuscle] += 1;
      totalExercises += 1;
    });
  });

  if (totalExercises === 0) {
    return 'ADD EXERCISES TO SEE FOCUS';
  }

  const rankedMuscles = PRIMARY_MUSCLE_GROUPS
    .map((group, index) => ({
      group,
      count: counts[group],
      index,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.index - right.index);

  const topMuscles = rankedMuscles.slice(0, 2);

  if (topMuscles.length === 1) {
    return `${formatMuscleGroupLabel(topMuscles[0].group)} FOCUS`;
  }

  return `${topMuscles.map((entry) => formatMuscleGroupLabel(entry.group)).join(' / ')} ${
    rankedMuscles.length > topMuscles.length ? 'MIX' : 'FOCUS'
  }`;
};

// --- Components ---

const AndroidBackHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  const listenerOperationsRef = useRef<Promise<void>>(Promise.resolve());
  const listenerCleanupFailedRef = useRef(false);
  pathnameRef.current = location.pathname;
  navigateRef.current = navigate;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    let disposed = false;
    let listener: PluginListenerHandle | undefined;

    const removeListener = async (handle: PluginListenerHandle) => {
      try {
        await handle.remove();
      } catch (error) {
        listenerCleanupFailedRef.current = true;
        console.error('Android back listener removal failed.', error);
      }
    };

    const addListenerOperation = listenerOperationsRef.current.then(async () => {
      if (disposed || listenerCleanupFailedRef.current) {
        return;
      }

      try {
        const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          const action = getAndroidBackAction(pathnameRef.current, canGoBack);

          if (action === 'history-back') {
            navigateRef.current(-1);
            return;
          }

          if (action === 'navigate-root') {
            navigateRef.current('/', { replace: true });
            return;
          }

          void CapacitorApp.exitApp().catch((error: unknown) => {
            console.error('Android back app exit failed.', error);
          });
        });

        if (disposed) {
          await removeListener(handle);
          return;
        }

        listener = handle;
      } catch (error) {
        console.error('Android back listener registration failed.', error);
      }
    });
    listenerOperationsRef.current = addListenerOperation;
    void addListenerOperation.catch(() => undefined);

    return () => {
      disposed = true;
      const removeListenerOperation = listenerOperationsRef.current.then(async () => {
        if (!listener) {
          return;
        }

        const handle = listener;
        listener = undefined;
        await removeListener(handle);
      });
      listenerOperationsRef.current = removeListenerOperation;
      void removeListenerOperation.catch(() => undefined);
    };
  }, []);

  return null;
};

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'GRIND', icon: Activity },
    { path: '/plans', label: 'PLANS', icon: Calendar },
    { path: '/prs', label: 'PRS', icon: Trophy },
    { path: '/settings', label: 'SETTINGS', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-black border-t-2 border-muted h-20 pb-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-1 flex-col items-center justify-center transition-all",
              isActive ? "text-primary border-t-4 border-primary pt-2" : "text-muted hover:text-text-main pt-3"
            )}
          >
            <item.icon size={24} className={cn("mb-1", isActive && "fill-primary")} />
            <span className="font-sans font-bold uppercase text-[10px] tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// --- Pages ---

const DailyGrind = ({ 
  exercises, 
  activePlan,
  unit,
  onLogSet,
  onCompleteWorkout 
}: { 
  exercises: Exercise[], 
  activePlan?: TrainingPlan,
  unit: Settings['unit'],
  onLogSet: (id: string, setIndex: number, weight: number, reps: number) => void,
  onCompleteWorkout: () => void 
}) => {
  const autoIncrement = activePlan?.advanced?.autoIncrement || false;
  const currentWeek = activePlan?.currentWeek || 1;
  const isFinalDeloadWeek = isDeloadWeek(activePlan, currentWeek);
  const getExerciseSetCount = (exercise: Exercise) =>
    getPlanExerciseSetCount(exercise, activePlan, currentWeek);
  const isCompleted = (exercise: Exercise) =>
    exercise.logs.filter(l => l?.completed).length >= getExerciseSetCount(exercise);
  const activeIndex = exercises.findIndex(ex => !isCompleted(ex));
  const activeExercise = exercises[activeIndex];
  const allCompleted = activeIndex === -1;

  const handleLogNextSet = () => {
    if (!activeExercise) return;
    const { actualSetIndex, defaultWeight, defaultReps } = getNextSetInfo(activeExercise, {
      autoIncrement,
      currentWeek,
      plan: activePlan,
    });
    if (actualSetIndex === null) return;
    onLogSet(activeExercise.id, actualSetIndex, defaultWeight, defaultReps);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-1 px-4 py-6 pb-32 flex flex-col gap-6"
    >
      {!allCompleted && activeExercise && (
        <button onClick={handleLogNextSet} className="brutal-btn w-full">
          <Bolt size={24} fill="currentColor" />
          LOG NEXT SET
        </button>
      )}

      {isFinalDeloadWeek && (
        <div className="border-2 border-primary bg-primary/10 px-4 py-3 text-center">
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">Final Week Deload</p>
          <p className="text-sm font-bold uppercase text-text-main">Weights run at 75% and sets use the reduced deload count.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {exercises.map((ex, idx) => {
          const completed = isCompleted(ex);
          const isActive = idx === activeIndex;
          const setCount = getExerciseSetCount(ex);
          const nextSetDisplay = getNextSetDisplayValues(ex, {
            autoIncrement,
            currentWeek,
            plan: activePlan,
            unit,
          });
          
          return (
            <Link 
              key={ex.id} 
              to={`/exercise/${ex.id}`} 
              className={cn(
                "brutal-card", 
                (isActive || completed) && "brutal-card-active",
                completed && "opacity-80"
              )}
            >
              {(isActive || completed) && <div className="glitch-bar" />}
              <div className="flex justify-between items-start mb-4">
                <h2 className={cn(
                  "text-2xl font-bold tracking-tight leading-tight w-3/4", 
                  !isActive && !completed && "text-muted"
                )}>
                  {ex.name}
                </h2>
                {completed ? (
                  <div className="bg-primary text-black px-2 py-1 text-xs font-bold rounded-sm border border-primary">
                    COMPLETE
                  </div>
                ) : isActive ? (
                  <div className="bg-primary/20 text-primary px-2 py-1 text-xs font-bold rounded-sm border border-primary">
                    UP NEXT
                  </div>
                ) : null}
              </div>
              <div className="flex justify-between items-end border-t border-muted pt-3">
                <div className="flex gap-4 text-sm font-bold text-muted">
                  <div>
                    <span className="block text-xs text-muted/60 mb-1">WEIGHT</span>
                    <span className={cn("text-lg", (isActive || completed) ? "text-text-main" : "text-muted")}>
                      {nextSetDisplay.weight}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted/60 mb-1">REPS</span>
                    <span className={cn("text-lg", (isActive || completed) ? "text-text-main" : "text-muted")}>
                      {nextSetDisplay.reps}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: setCount }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-8 h-8 rounded-sm brutal-border flex items-center justify-center text-muted text-xs",
                        ex.logs[i]?.completed && "bg-primary text-black border-primary"
                      )}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {allCompleted && (
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onCompleteWorkout}
          className="brutal-btn w-full bg-primary text-black mt-4"
        >
          <Check size={24} />
          COMPLETE WORKOUT & ADVANCE
        </motion.button>
      )}
    </motion.div>
  );
};

const ExerciseLog = ({ exercises, activePlan, settings, onLogSet, onUnlogSet, onAddSet, onRemoveSet }: {
  exercises: Exercise[],
  activePlan?: TrainingPlan,
  settings: Settings,
  onLogSet: (id: string, setIndex: number, weight: number, reps: number) => void,
  onUnlogSet: (id: string, setIndex: number) => void,
  onAddSet: (id: string) => void,
  onRemoveSet: (id: string) => void
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = exercises.find(e => e.id === id);

  const autoIncrement = activePlan?.advanced?.autoIncrement || false;
  const currentWeek = activePlan?.currentWeek || 1;
  const isFinalDeloadWeek = isDeloadWeek(activePlan, currentWeek);
  const [inputValues, setInputValues] = useState<ExerciseLogInputValue[]>(
    () => exercise ? createExerciseLogInputValues(exercise, { autoIncrement, currentWeek, plan: activePlan }) : []
  );
  const previousExerciseIdRef = useRef<string | undefined>(exercise?.id);

  // Keep inputValues in sync when the selected exercise or its defaults change.
  useEffect(() => {
    if (!exercise) return;
    const shouldResetDrafts = previousExerciseIdRef.current !== exercise.id;
    setInputValues((prev) =>
      syncExerciseLogInputValues(
        prev,
        exercise,
        { autoIncrement, currentWeek, plan: activePlan },
        shouldResetDrafts
      )
    );
    previousExerciseIdRef.current = exercise.id;
  }, [exercise, activePlan, autoIncrement, currentWeek]);

  if (!exercise) return <div>Exercise not found</div>;
  const planSetCount = getPlanExerciseSetCount(exercise, activePlan, currentWeek);
  const nextIncompleteSetIndex = getNextIncompleteSetIndex(exercise.logs, planSetCount);

  const handleWeightChange = (i: number, value: number) => {
    setInputValues((prev) =>
      applyWeightChangeToInputs(prev, exercise, i, value, settings.matchWeight, {
        plan: activePlan,
        autoIncrement,
        currentWeek,
      })
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-50 bg-black flex flex-col overflow-y-auto"
    >
      <header className="sticky top-0 z-50 bg-black border-b-2 border-muted pb-4 pt-6 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-white size-12 flex items-center justify-center border-2 border-transparent hover:border-muted rounded transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {isFinalDeloadWeek && (
              <div className="text-primary text-[10px] tracking-widest font-bold bg-primary/10 px-3 py-1 rounded border-2 border-primary uppercase">
                Deload Week
              </div>
            )}
            {exercise.recommended && (
              <div className="text-secondary text-sm tracking-widest font-bold bg-surface px-3 py-1 rounded border-2 border-muted">
                REC: {exercise.recommended.weight}{settings.unit.toUpperCase()} x {exercise.recommended.reps}
              </div>
            )}
          </div>
        </div>
        <h1 className="text-white text-[48px] font-bold leading-[1.1] tracking-tighter uppercase">
          {exercise.name.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
        </h1>
        {isFinalDeloadWeek && (
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">75% weight, reduced deload set count</p>
        )}
      </header>

      <main className="flex-1 p-4 pb-24 flex flex-col gap-4">
        <div className="flex text-muted text-xs font-bold px-2 tracking-widest mb-2">
          <div className="w-12">SET</div>
          <div className="flex-1 text-center">{settings.unit.toUpperCase()}</div>
          <div className="flex-1 text-center">REPS</div>
          <div className="w-16 text-center">LOG</div>
        </div>

        {Array.from({ length: planSetCount }).map((_, i) => {
          const log = exercise.logs[i];
          const isNext = i === nextIncompleteSetIndex;
          const isCompleted = log?.completed || false;
          const currentWeight = isCompleted ? log.weight : (inputValues[i]?.weight ?? 0);
          const currentReps = isCompleted ? log.reps : (inputValues[i]?.reps ?? 0);

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 bg-surface p-3 rounded border-2 transition-all duration-150",
                isCompleted ? "border-primary bg-primary/10" : "border-muted",
                isNext && "border-secondary"
              )}
            >
              <div className={cn("w-8 font-bold text-xl text-center", isCompleted ? "text-primary" : "text-white")}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <input
                className={cn("brutal-input flex-1", isCompleted && "text-primary border-primary")}
                type="number"
                value={currentWeight}
                disabled={isCompleted}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleWeightChange(i, Number(e.target.value))}
              />
              <input
                className={cn("brutal-input flex-1", isCompleted && "text-primary border-primary")}
                type="number"
                value={currentReps}
                disabled={isCompleted}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInputValues((prev) => applyRepsChangeToInputs(prev, i, Number(e.target.value)))
                }
              />
              <button
                onClick={() => {
                  if (isCompleted) {
                    onUnlogSet(exercise.id, i);
                  } else {
                    onLogSet(exercise.id, i, inputValues[i]?.weight ?? 0, inputValues[i]?.reps ?? 0);
                  }
                }}
                className={cn(
                  "w-14 h-14 rounded font-bold flex items-center justify-center shadow-brutal active:translate-y-1 active:translate-x-1 active:shadow-none transition-all",
                  isCompleted ? "bg-primary text-black" : "bg-background border-2 border-primary text-primary"
                )}
              >
                {isCompleted ? <Check size={28} /> : <Plus size={28} />}
              </button>
            </div>
          );
        })}

        <div className="flex gap-2">
          <button
            onClick={() => onAddSet(exercise.id)}
            className="flex-1 h-14 border-2 border-dashed border-muted text-muted font-bold rounded flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={20} /> ADD WORKING SET
          </button>
          <button
            onClick={() => onRemoveSet(exercise.id)}
            className="w-14 h-14 border-2 border-muted text-danger font-bold rounded flex items-center justify-center hover:border-danger transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </main>
    </motion.div>
  );
};

const TrainingPlans = ({ plans, activePlanId, onSelectPlan, onRestartPlan, onDeletePlan, dayCounter }: { 
  plans: TrainingPlan[], 
  activePlanId: string | null,
  onSelectPlan: (id: string) => void,
  onRestartPlan: (id: string) => void,
  onDeletePlan: (id: string) => void,
  dayCounter: number
}) => {
  const navigate = useNavigate();
  const activePlan = plans.find(p => p.id === activePlanId);
  const progress = activePlan ? getPlanProgressSnapshot(activePlan) : null;
  const currentWeek = progress?.displayWeek ?? 0;
  const activePlanInDeloadWeek = activePlan ? isDeloadWeek(activePlan, currentWeek) : false;
  const todayName = activePlan ? PLAN_DAYS[(Math.min(dayCounter, progress?.totalDays ?? dayCounter) - 1) % 7] : "";

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-1 px-6 pt-24 pb-32 max-w-2xl mx-auto"
    >
      <div className="mb-12">
        <h2 className="font-display text-6xl tracking-tight leading-none text-text-main uppercase">TRAINING<br/><span className="text-primary">PLANS</span></h2>
        <div className="h-1 w-24 bg-primary mt-4"></div>
      </div>

      {activePlan ? (
        <section className="mb-12">
          <div className="font-mono text-xs text-muted mb-3 tracking-[0.2em]">CURRENT PROGRAM</div>
          <div className="bg-surface border-2 border-primary p-6 rounded relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display text-4xl text-text-main leading-none uppercase">{activePlan.name}</h3>
                <p className="font-mono text-primary text-sm mt-1 uppercase">
                  WEEK {currentWeek} OF {activePlan.durationWeeks}{activePlanInDeloadWeek ? ' • DELOAD' : ''}
                </p>
                {activePlan.deload?.enabled && (
                  <p className="font-mono text-[10px] text-muted mt-2 uppercase tracking-[0.2em]">
                    {activePlan.deload.baseDurationWeeks} base weeks plus a final deload week
                  </p>
                )}
              </div>
              <div className="bg-primary text-black px-2 py-1 font-display text-sm">ACTIVE</div>
            </div>
            <div className="grid grid-cols-12 gap-1 mb-4">
              {Array.from({ length: activePlan.durationWeeks }).map((_, i) => (
                <div key={i} className={cn("h-2", i < (progress?.completedWeeks ?? 0) ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <div className="flex justify-between items-center font-mono text-[10px] text-muted">
              <span>PROGRESS: {progress?.progressPercent ?? 0}%</span>
              <span>{progress?.weeksRemaining ?? 0} WEEKS REMAINING</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-12">
          <div className="font-mono text-xs text-muted mb-3 tracking-[0.2em]">CURRENT PROGRAM</div>
          <div className="bg-surface border-2 border-muted p-6 rounded text-center">
            <p className="font-mono text-muted text-sm uppercase">NO ACTIVE PROGRAM</p>
          </div>
        </section>
      )}

      {plans.length > 0 && (
        <section className="mb-12">
          <div className="font-mono text-xs text-muted mb-3 tracking-[0.2em]">YOUR PROTOCOLS</div>
          <div className="flex flex-col gap-2">
            {plans.map(p => (
              <div 
                key={p.id}
                className={cn(
                  "border-2 rounded bg-surface transition-all",
                  p.id === activePlanId ? "border-primary bg-primary/5" : "border-muted bg-surface hover:border-primary"
                )}
              >
                <button
                  onClick={() => onSelectPlan(p.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex flex-col">
                    <span className={cn("font-display text-xl leading-none", p.id === activePlanId ? "text-primary" : "text-text-main")}>{p.name}</span>
                    <span className="font-mono text-[10px] text-muted mt-1 uppercase">WEEK {p.currentWeek} • DAY {String(p.currentDay).padStart(3, '0')}</span>
                  </div>
                  {p.id === activePlanId && <Check size={20} className="text-primary" />}
                </button>
                <div className="grid grid-cols-3 gap-2 border-t border-muted/60 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/create-plan?edit=${p.id}`)}
                    className="flex min-h-11 items-center justify-center gap-2 border border-muted px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-text-main uppercase transition-colors hover:border-primary hover:text-primary"
                  >
                    <Pencil size={14} />
                    EDIT
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestartPlan(p.id)}
                    className="flex min-h-11 items-center justify-center gap-2 border border-muted px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-text-main uppercase transition-colors hover:border-primary hover:text-primary"
                  >
                    <RotateCcw size={14} />
                    RESET
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePlan(p.id)}
                    className="flex min-h-11 items-center justify-center gap-2 border border-danger/70 px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-danger uppercase transition-colors hover:border-danger hover:bg-danger hover:text-black"
                  >
                    <Trash2 size={14} />
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activePlan && (
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="font-mono text-xs text-muted mb-1 tracking-[0.2em]">WORKOUT BLOCKS</div>
              <h4 className="font-display text-2xl text-text-main uppercase">WEEKLY SCHEDULE</h4>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {PLAN_DAYS.map((day, i) => {
              const item = activePlan.schedule[day];
              const isToday = day === todayName;
              return (
                <div 
                  key={day} 
                  className={cn(
                    "flex items-center p-4 rounded border-2 transition-transform",
                    isToday ? "bg-surface border-primary" : "bg-surface border-muted opacity-60"
                  )}
                >
                  <div className="flex flex-col items-center justify-center w-12 border-r-2 border-muted mr-4 pr-4">
                    <span className="font-mono text-[10px] text-muted">{day}</span>
                    <span className={cn("font-display text-xl", isToday ? "text-primary" : "text-text-main")}>{i + 1}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="font-display text-lg text-text-main uppercase">{item.type === 'workout' ? 'WORKOUT' : 'REST'}</div>
                    <div className={cn("font-mono text-[10px] flex flex-wrap gap-1 mt-1", isToday ? "text-primary" : "text-muted")}>
                      {item.type === 'workout' && item.exercises && item.exercises.length > 0 ? (
                        item.exercises.map((ex, idx) => (
                          <span key={idx} className="border border-current px-1">[{ex}]</span>
                        ))
                      ) : (
                        <span>{item.description}</span>
                      )}
                    </div>
                  </div>
                  {item.type === 'workout' ? (
                    <ChevronRight size={20} className={isToday ? "text-primary" : "text-muted"} />
                  ) : (
                    <Lock size={20} className="text-muted" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button onClick={() => navigate('/create-plan')} className="brutal-btn w-full">
        <Plus size={24} /> CREATE NEW PLAN
      </button>
    </motion.div>
  );
};

const CreatePlan = ({
  onSave,
  existingExercises,
  plans,
}: {
  onSave: (
    plan: TrainingPlan,
    exercisePrimaryMuscles: Record<string, PrimaryMuscleGroup>,
    mode: 'create' | 'edit'
  ) => void,
  plans: TrainingPlan[],
  existingExercises: PlanExerciseOption[]
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const editPlanId = new URLSearchParams(location.search).get('edit');
  const planToEdit = plans.find((plan) => plan.id === editPlanId);
  const isEditing = Boolean(planToEdit);
  const [name, setName] = useState(() => planToEdit?.name ?? '');
  const [duration, setDuration] = useState(() => planToEdit?.deload?.baseDurationWeeks ?? planToEdit?.durationWeeks ?? 4);
  const [schedule, setSchedule] = useState<Record<string, PlanEditorDay>>(() => createPlanEditorSchedule(planToEdit));
  const [autoIncrement, setAutoIncrement] = useState(() => planToEdit?.advanced?.autoIncrement ?? false);
  const [deloadEnabled, setDeloadEnabled] = useState(() => planToEdit?.deload?.enabled ?? false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [workoutInput, setWorkoutInput] = useState('');
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<PrimaryMuscleGroup>(DEFAULT_PRIMARY_MUSCLE_GROUP);
  const [exercisePrimaryMuscles, setExercisePrimaryMuscles] = useState<Record<string, PrimaryMuscleGroup>>(
    () =>
      existingExercises.reduce<Record<string, PrimaryMuscleGroup>>((accumulator, exercise) => {
        accumulator[exercise.name.toUpperCase()] = exercise.primaryMuscle;
        return accumulator;
      }, {})
  );
  const workoutSuggestions = getPlanExerciseSuggestions(existingExercises, workoutInput);

  useEffect(() => {
    if (editPlanId && !planToEdit) {
      navigate('/plans', { replace: true });
      return;
    }

    setName(planToEdit?.name ?? '');
    setDuration(planToEdit?.deload?.baseDurationWeeks ?? planToEdit?.durationWeeks ?? 4);
    setSchedule(createPlanEditorSchedule(planToEdit));
    setAutoIncrement(planToEdit?.advanced?.autoIncrement ?? false);
    setDeloadEnabled(planToEdit?.deload?.enabled ?? false);
    setEditingDay(null);
    setWorkoutInput('');
    setSelectedPrimaryMuscle(DEFAULT_PRIMARY_MUSCLE_GROUP);
  }, [editPlanId, navigate, planToEdit]);

  const handleAddWorkout = (day: string, value = workoutInput) => {
    const draft = buildPlanExerciseDraft(existingExercises, value, selectedPrimaryMuscle);
    if (!draft) {
      setEditingDay(null);
      setWorkoutInput('');
      setSelectedPrimaryMuscle(DEFAULT_PRIMARY_MUSCLE_GROUP);
      return;
    }

    setSchedule(prev => ({
      ...prev,
      [day]: addExerciseToPlanDay(prev[day], draft.name)
    }));
    setExercisePrimaryMuscles(prev => ({
      ...prev,
      [draft.name]: draft.primaryMuscle,
    }));
    setEditingDay(null);
    setWorkoutInput('');
    setSelectedPrimaryMuscle(DEFAULT_PRIMARY_MUSCLE_GROUP);
  };

  const handleSave = () => {
    if (!name) return alert("PLEASE ENTER A PLAN NAME");
    const totalDurationWeeks = duration + (deloadEnabled ? 1 : 0);
    const newPlan: TrainingPlan = {
      id: planToEdit?.id ?? createId(),
      name: name.toUpperCase(),
      durationWeeks: totalDurationWeeks,
      currentWeek: planToEdit?.currentWeek ?? 1,
      currentDay: planToEdit?.currentDay ?? 1,
      schedule,
      advanced: {
        autoIncrement
      },
      deload: deloadEnabled
        ? {
            enabled: true,
            baseDurationWeeks: duration,
          }
        : undefined,
    };
    onSave(newPlan, exercisePrimaryMuscles, planToEdit ? 'edit' : 'create');
    navigate('/plans');
  };

  return (
    <motion.div 
      initial={{ y: '100%' }} 
      animate={{ y: 0 }} 
      exit={{ y: '100%' }}
      className="fixed inset-0 z-[60] bg-black flex flex-col pb-24 overflow-y-auto"
    >
      <header className="bg-black/95 backdrop-blur-sm border-b-2 border-muted sticky top-0 z-50 flex justify-between items-center w-full px-4 h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-primary hover:bg-primary hover:text-black transition-colors p-1">
            <Plus className="rotate-45" size={24} />
          </button>
          <h1 className="font-display font-black italic tracking-tighter text-primary text-xl uppercase">{isEditing ? 'EDIT PLAN' : 'NEW PLAN'}</h1>
        </div>
        <button 
          onClick={handleSave}
          className="text-primary font-bold text-sm tracking-widest hover:bg-primary hover:text-black transition-colors px-3 py-1 border-2 border-transparent active:translate-x-[1px] active:translate-y-[1px] uppercase"
        >
          SAVE
        </button>
      </header>

      <main className="flex-grow p-4 space-y-8 max-w-2xl mx-auto w-full">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary"></div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-muted uppercase">01 // PLAN IDENTITY</h2>
          </div>
          <input 
            className="w-full bg-surface border-2 border-muted p-6 text-2xl font-black tracking-tighter focus:outline-none focus:border-primary focus:shadow-brutal transition-all placeholder:text-muted rounded-none uppercase" 
            placeholder="ENTER PLAN NAME..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary"></div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-muted uppercase">02 // CYCLE LENGTH</h2>
          </div>
          <div className="bg-surface border-2 border-muted p-6 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <span className="font-display text-4xl text-primary">{duration}</span>
              <span className="font-mono text-sm text-muted uppercase mb-1 tracking-widest">WEEKS</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={duration} 
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-black appearance-none outline-none cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[10px] text-muted">
              <span>1</span>
              <span>10</span>
            </div>
            {deloadEnabled && (
              <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">
                Save adds one final deload week: {duration + 1} total weeks
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary"></div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-muted uppercase">03 // WEEKLY BLOCKS</h2>
          </div>
          <div className="space-y-3">
            {Object.keys(schedule).map(day => (
              <div 
                key={day} 
                className={cn(
                  "bg-surface border-2 p-4 flex flex-col gap-4 relative",
                  schedule[day].type === 'workout' ? "border-primary" : "border-muted"
                )}
              >
                {schedule[day].type === 'workout' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("text-xl font-black italic w-12 shrink-0", schedule[day].type === 'workout' ? "text-primary" : "text-muted")}>{day}</span>
                  
                  {schedule[day].type === 'workout' && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {schedule[day].exercises.map((ex, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#222222] px-2 py-1 border border-primary">
                          <span className="text-[10px] font-bold text-primary uppercase">[{ex}]</span>
                          <button 
                            onClick={() => {
                              setSchedule(prev => ({
                                ...prev,
                                [day]: {
                                  ...removeExerciseFromPlanDay(prev[day], idx)
                                }
                              }));
                            }}
                            className="text-primary hover:text-danger"
                          >
                            <Plus className="rotate-45" size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], type: 'workout', description: 'ASSIGN ROUTINE' } }))}
                      className={cn("px-4 py-1 text-xs font-bold border", schedule[day].type === 'workout' ? "bg-primary text-black border-primary" : "bg-transparent text-muted border-muted")}
                    >
                      WORKOUT
                    </button>
                    <button 
                      onClick={() => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], type: 'rest', description: 'REST DAY' } }))}
                      className={cn("px-4 py-1 text-xs font-bold border", schedule[day].type === 'rest' ? "bg-white text-black border-white" : "bg-transparent text-muted border-muted")}
                    >
                      REST
                    </button>
                  </div>

                  {schedule[day].type === 'workout' && (
                    <div className="flex items-center gap-2">
                      {editingDay === day ? (
                        <div className="flex flex-col gap-2 relative">
                          <div className="flex gap-2">
                            <input 
                              autoFocus
                              className="bg-black border border-primary text-[10px] px-2 py-1 text-primary focus:outline-none w-32 uppercase font-mono"
                              placeholder="WORKOUT NAME..."
                              value={workoutInput}
                              onChange={(e) => setWorkoutInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddWorkout(day);
                                }
                              }}
                            />
                            <button onClick={() => handleAddWorkout(day)} className="text-primary hover:text-white">
                              <Check size={14} />
                            </button>
                            <button onClick={() => { setEditingDay(null); setWorkoutInput(''); }} className="text-danger hover:text-white">
                              <Plus className="rotate-45" size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted uppercase tracking-widest">TAG</span>
                            <select
                              aria-label="Primary muscle group"
                              className="flex-1 bg-black border border-muted text-[10px] px-2 py-2 text-text-main focus:outline-none focus:border-primary uppercase font-mono"
                              value={selectedPrimaryMuscle}
                              onChange={(e) => setSelectedPrimaryMuscle(e.target.value as PrimaryMuscleGroup)}
                            >
                              {PRIMARY_MUSCLE_GROUPS.map((muscle) => (
                                <option key={muscle} value={muscle}>
                                  {muscle}
                                </option>
                              ))}
                            </select>
                          </div>
                          {workoutSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-surface border-2 border-primary z-50 max-h-32 overflow-y-auto">
                              {workoutSuggestions.map(ex => (
                                <button
                                  key={ex.name}
                                  className="w-full text-left px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary hover:text-black uppercase"
                                  type="button"
                                  onClick={() => {
                                    handleAddWorkout(day, ex.name);
                                  }}
                                >
                                  <span>{ex.name}</span>
                                  <span className="ml-2 text-[9px] opacity-70">{ex.primaryMuscle}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingDay(day);
                            setWorkoutInput('');
                            setSelectedPrimaryMuscle(DEFAULT_PRIMARY_MUSCLE_GROUP);
                          }}
                          className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest group"
                        >
                          <Plus size={16} />
                          <span className="group-hover:underline uppercase">ADD EXERCISE</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-2 border-muted p-6 bg-surface grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted tracking-widest uppercase">ADVANCED OPTIONS</p>
            <div className="flex items-center justify-between border-b border-muted pb-2">
              <span className="text-sm font-bold uppercase">AUTO-INCREMENT WEIGHT</span>
              <button 
                onClick={() => setAutoIncrement(!autoIncrement)}
                className={cn("w-10 h-5 relative transition-colors", autoIncrement ? "bg-primary" : "bg-muted")}
              >
                <div className={cn("absolute top-1 bottom-1 w-3 bg-white transition-all", autoIncrement ? "right-1" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-muted pb-2">
              <span className="text-sm font-bold uppercase">FINAL DELOAD WEEK</span>
              <button
                onClick={() => setDeloadEnabled(!deloadEnabled)}
                className={cn("w-10 h-5 relative transition-colors", deloadEnabled ? "bg-primary" : "bg-muted")}
              >
                <div className={cn("absolute top-1 bottom-1 w-3 bg-white transition-all", deloadEnabled ? "right-1" : "left-1")} />
              </button>
            </div>
            <p className="font-mono text-[10px] leading-tight text-muted uppercase">
              Deload week keeps decimal weights, uses 75% of working weight, and rounds the reduced set count up.
            </p>
          </div>
          <div className="bg-black/40 p-4 border-l-4 border-primary">
            <p className="text-[10px] leading-tight text-muted uppercase">PLAN SUMMARY</p>
            <p className="text-lg font-black mt-1 uppercase">
              {(Object.values(schedule) as { type: string }[]).filter(s => s.type === 'workout').length} DAYS/WEEK • {deloadEnabled ? `${duration} + DELOAD` : `${duration} WEEKS`}
            </p>
            <p className="text-[10px] text-primary mt-2 italic uppercase">
              {buildPlanFocusSummary(schedule, exercisePrimaryMuscles)}
            </p>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full flex flex-row items-center justify-stretch bg-black z-50 border-t-2 border-muted shadow-brutal">
        <button 
          onClick={() => navigate(-1)}
          className="flex flex-col items-center justify-center text-white p-4 w-1/2 border-r-2 border-muted hover:bg-primary/90 hover:text-black transition-all active:scale-95 duration-100 group"
        >
          <Plus className="rotate-45 mb-1" size={24} />
          <span className="font-sans uppercase font-bold tracking-widest text-[10px]">CANCEL</span>
        </button>
        <button 
          onClick={handleSave}
          className="flex flex-col items-center justify-center bg-primary text-black p-4 w-1/2 hover:bg-primary/90 transition-all active:scale-95 duration-100"
        >
          <Check className="mb-1" size={24} />
          <span className="font-sans uppercase font-bold tracking-widest text-[10px]">SAVE PLAN</span>
        </button>
      </nav>
    </motion.div>
  );
};

const ManageExercisesScreen = ({
  exercises,
  onSelectExercise,
  onClose,
}: {
  exercises: Exercise[];
  onSelectExercise: (exerciseId: string) => void;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    className="fixed inset-0 z-[70] bg-black flex flex-col overflow-y-auto"
  >
    <header className="sticky top-0 z-50 bg-black border-b-2 border-muted px-4 h-16 flex items-center justify-between">
      <button onClick={onClose} className="text-white size-12 flex items-center justify-center border-2 border-transparent hover:border-muted rounded transition-colors">
        <ArrowLeft size={24} />
      </button>
      <h1 className="font-display text-primary text-xl uppercase">MANAGE EXERCISES</h1>
      <div className="w-12" />
    </header>

    <main className="flex-1 p-4 pb-24 flex flex-col gap-3">
      {exercises.length === 0 ? (
        <div className="border-2 border-dashed border-muted rounded-sm p-8 text-center">
          <p className="text-muted font-bold tracking-widest uppercase">NO SAVED EXERCISES</p>
        </div>
      ) : (
        exercises.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onSelectExercise(exercise.id)}
            className="w-full bg-surface border-2 border-muted px-4 py-4 flex items-center justify-between text-left hover:border-primary transition-none"
          >
            <div>
              <div className="text-lg font-bold uppercase text-text-main">{exercise.name}</div>
              <div className="text-[10px] font-mono uppercase text-muted tracking-widest mt-1">
                {exercise.primaryMuscle}
              </div>
            </div>
            <ChevronRight size={20} className="text-primary" />
          </button>
        ))
      )}
    </main>
  </motion.div>
);

const EditExerciseScreen = ({
  exercise,
  onClose,
  onSave,
  onDelete,
}: {
  exercise: Exercise;
  onClose: () => void;
  onSave: (args: {
    exerciseId: string;
    nextName: string;
    nextPrimaryMuscle: PrimaryMuscleGroup;
  }) => { ok: true } | { ok: false; error: string };
  onDelete: (exerciseId: string) => void;
}) => {
  const [name, setName] = useState(exercise.name);
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscleGroup>(exercise.primaryMuscle);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(exercise.name);
    setPrimaryMuscle(exercise.primaryMuscle);
    setError('');
    setShowDeleteConfirm(false);
  }, [exercise]);

  const handleSave = () => {
    const result = onSave({
      exerciseId: exercise.id,
      nextName: name,
      nextPrimaryMuscle: primaryMuscle,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[80] bg-black flex flex-col overflow-y-auto"
    >
      <header className="sticky top-0 z-50 bg-black border-b-2 border-muted px-4 h-16 flex items-center justify-between">
        <button onClick={onClose} className="text-white size-12 flex items-center justify-center border-2 border-transparent hover:border-muted rounded transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-display text-primary text-xl uppercase">EDIT EXERCISE</h1>
        <button
          onClick={handleSave}
          className="text-primary font-bold text-sm tracking-widest hover:bg-primary hover:text-black transition-colors px-3 py-1 border-2 border-transparent uppercase"
        >
          SAVE
        </button>
      </header>

      <main className="flex-1 p-4 pb-24 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">NAME</label>
          <input
            className="w-full bg-surface border-2 border-muted p-4 text-xl font-black tracking-tight focus:outline-none focus:border-primary uppercase"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError('');
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">PRIMARY MUSCLE</label>
          <select
            className="w-full bg-surface border-2 border-muted p-4 text-sm font-mono uppercase focus:outline-none focus:border-primary"
            value={primaryMuscle}
            onChange={(event) => setPrimaryMuscle(event.target.value as PrimaryMuscleGroup)}
          >
            {PRIMARY_MUSCLE_GROUPS.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscle}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-danger text-xs font-mono uppercase tracking-[0.2em]">{error}</p>
        ) : null}

        <div className="mt-auto border-t-2 border-muted pt-6">
          <p className="text-[10px] font-mono text-danger uppercase tracking-[0.2em] mb-4">Danger Zone</p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full h-14 border-2 border-danger text-danger font-bold tracking-widest uppercase hover:bg-danger hover:text-black transition-none"
          >
            DELETE EXERCISE
          </button>
        </div>
      </main>

      <AnimatePresence>
        {showDeleteConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-surface border-4 border-danger p-8 w-full max-w-sm text-center">
              <h3 className="font-display text-4xl text-danger mb-4">DELETE EXERCISE</h3>
              <p className="font-mono text-sm mb-8 uppercase">
                THIS REMOVES {exercise.name} FROM SAVED EXERCISES, PLAN SCHEDULES, AND PR VAULT.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    onDelete(exercise.id);
                    onClose();
                  }}
                  className="brutal-btn bg-danger border-black text-black shadow-none"
                >
                  CONFIRM DELETE
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="font-display text-xl text-text-main"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

const SettingsPage = ({
  settings,
  setSettings,
  exercises,
  onToggleUnit,
  onWipeData,
  onExportData,
  onImportData,
  onSaveExerciseEdits,
  onDeleteExercise,
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  exercises: Exercise[];
  onToggleUnit: () => void;
  onWipeData: () => void;
  onExportData: () => void;
  onImportData: (data: ImportedBackupData) => void;
  onSaveExerciseEdits: (args: {
    exerciseId: string;
    nextName: string;
    nextPrimaryMuscle: PrimaryMuscleGroup;
  }) => { ok: true } | { ok: false; error: string };
  onDeleteExercise: (exerciseId: string) => void;
}) => {
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editingExercise = exercises.find((exercise) => exercise.id === editingExerciseId) ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = parseImportedBackupFile((evt.target?.result as string) ?? '');
      if (result.ok) {
        onImportData(result.value);
        return;
      }

      alert('error' in result ? result.error : 'INVALID BACKUP FILE');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pb-32"
    >
      <Header title="SYSTEM PREFS" />
      
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col mt-8">
        <h2 className="text-sm text-muted uppercase tracking-widest px-4 mb-2 font-mono">PREFERENCES</h2>
        
        <div className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black">
          <span className="text-xl font-bold uppercase tracking-wider">UNIT ({settings.unit.toUpperCase()})</span>
          <button 
            onClick={onToggleUnit}
            className={cn("w-20 h-10 rounded-sm relative transition-colors", settings.unit === 'lbs' ? "bg-primary" : "bg-muted")}
          >
            <div className={cn("absolute top-1 w-8 h-8 bg-white rounded-sm transition-all", settings.unit === 'lbs' ? "left-11" : "left-1")} />
          </button>
        </div>

        <div className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black">
          <span className="text-xl font-bold uppercase tracking-wider">HAPTIC FEEDBACK</span>
          <button 
            onClick={() => setSettings(s => ({ ...s, hapticFeedback: !s.hapticFeedback }))}
            className={cn("w-20 h-10 rounded-sm relative transition-colors", settings.hapticFeedback ? "bg-primary" : "bg-muted")}
          >
            <div className={cn("absolute top-1 w-8 h-8 bg-white rounded-sm transition-all", settings.hapticFeedback ? "left-11" : "left-1")} />
          </button>
        </div>

        <div className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black">
          <span className="text-xl font-bold uppercase tracking-wider">MATCH WEIGHT</span>
          <button 
            onClick={() => setSettings(s => ({ ...s, matchWeight: !s.matchWeight }))}
            className={cn("w-20 h-10 rounded-sm relative transition-colors", settings.matchWeight ? "bg-primary" : "bg-muted")}
          >
            <div className={cn("absolute top-1 w-8 h-8 bg-white rounded-sm transition-all", settings.matchWeight ? "left-11" : "left-1")} />
          </button>
        </div>

        <h2 className="text-sm text-muted uppercase tracking-widest px-4 mb-2 mt-12 font-mono">EXERCISES</h2>

        <button
          onClick={() => setShowManageExercises(true)}
          className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black group hover:bg-surface transition-none"
        >
          <span className="text-xl font-bold uppercase tracking-wider group-hover:text-primary">MANAGE EXERCISES</span>
          <ChevronRight size={24} className="text-primary" />
        </button>

        <h2 className="text-sm text-muted uppercase tracking-widest px-4 mb-2 mt-12 font-mono">DATA</h2>
        
        <button onClick={onExportData} className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black group hover:bg-surface transition-none">
          <span className="text-xl font-bold uppercase tracking-wider group-hover:text-secondary">EXPORT RAW DATA</span>
          <Download size={24} className="text-secondary" />
        </button>

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-between h-16 px-4 border-b-2 border-surface bg-black group hover:bg-surface transition-none">
          <span className="text-xl font-bold uppercase tracking-wider group-hover:text-primary">IMPORT BACKUP</span>
          <RefreshCw size={24} className="text-primary" />
        </button>

        <div className="mt-16 px-4">
          <h2 className="text-sm text-danger uppercase tracking-widest mb-4 font-mono">DANGER ZONE</h2>
          <button 
            onClick={() => setShowWipeConfirm(true)}
            className="w-full h-16 bg-black border-2 border-danger text-danger font-display text-2xl tracking-widest uppercase hover:bg-danger hover:text-black shadow-brutal-danger active:translate-y-1 active:translate-x-1 active:shadow-none transition-none"
          >
            WIPE ALL DATA
          </button>
          <p className="text-[10px] text-muted mt-4 text-center font-mono">THIS ACTION CANNOT BE UNDONE. IT WILL DESTROY EVERYTHING.</p>
        </div>
      </main>

      <AnimatePresence>
        {showWipeConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-surface border-4 border-danger p-8 w-full max-w-sm text-center">
              <h3 className="font-display text-4xl text-danger mb-4">CRITICAL ALERT</h3>
              <p className="font-mono text-sm mb-8">ARE YOU ABSOLUTELY SURE? ALL WORKOUT LOGS, PRS, AND PLANS WILL BE PERMANENTLY DELETED.</p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => { onWipeData(); setShowWipeConfirm(false); }}
                  className="brutal-btn bg-danger border-black text-black shadow-none"
                >
                  CONFIRM WIPE
                </button>
                <button 
                  onClick={() => setShowWipeConfirm(false)}
                  className="font-display text-xl text-text-main"
                >
                  ABORT
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {showManageExercises ? (
          <ManageExercisesScreen
            exercises={exercises}
            onSelectExercise={setEditingExerciseId}
            onClose={() => {
              setShowManageExercises(false);
              setEditingExerciseId(null);
            }}
          />
        ) : null}
        {showManageExercises && editingExercise ? (
          <EditExerciseScreen
            exercise={editingExercise}
            onClose={() => setEditingExerciseId(null)}
            onSave={onSaveExerciseEdits}
            onDelete={(exerciseId) => {
              onDeleteExercise(exerciseId);
              setEditingExerciseId(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    return parseStoredValue(
      localStorage.getItem('workout_exercises'),
      normalizeExercisesForStorage,
      INITIAL_EXERCISES.map((exercise) => ({
        ...exercise,
        sets: 2,
      }))
    );
  });
  const [prs, setPrs] = useState<PR[]>(() => {
    return parseStoredValue(
      localStorage.getItem('workout_prs'),
      normalizePrsForStorage,
      INITIAL_PRS
    );
  });
  const [plans, setPlans] = useState<TrainingPlan[]>(() => {
    return parseStoredValue(
      localStorage.getItem('workout_plans'),
      normalizePlansForStorage,
      []
    );
  });
  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    return parseStoredString(localStorage.getItem('workout_activePlanId'), null);
  });
  const [settings, setSettings] = useState<Settings>(() => {
    return parseStoredValue(
      localStorage.getItem('workout_settings'),
      normalizeSettings,
      DEFAULT_SETTINGS
    );
  });

  useEffect(() => { localStorage.setItem('workout_exercises', JSON.stringify(exercises)); }, [exercises]);
  useEffect(() => { localStorage.setItem('workout_prs', JSON.stringify(prs)); }, [prs]);
  useEffect(() => { localStorage.setItem('workout_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { if (activePlanId) localStorage.setItem('workout_activePlanId', activePlanId); else localStorage.removeItem('workout_activePlanId'); }, [activePlanId]);
  useEffect(() => { localStorage.setItem('workout_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (activePlanId && !plans.some((plan) => plan.id === activePlanId)) {
      setActivePlanId(null);
    }
  }, [activePlanId, plans]);

  const handleToggleUnit = () => {
    const newUnit = settings.unit === 'lbs' ? 'kg' : 'lbs';
    const convert = (w: number) => {
      if (newUnit === 'kg') return Math.round(w * 0.453592 * 10) / 10;
      return Math.round(w * 2.20462 * 10) / 10;
    };

    setSettings(s => ({ ...s, unit: newUnit }));
    
    setExercises(prev => prev.map(ex => ({
      ...ex,
      recommended: ex.recommended ? { ...ex.recommended, weight: convert(ex.recommended.weight) } : undefined,
      logs: ex.logs.map(log => log ? { ...log, weight: convert(log.weight) } : undefined),
      lastLogs: ex.lastLogs?.map(log => log ? { ...log, weight: convert(log.weight) } : undefined)
    })));

    setPrs(prev => prev.map(pr => ({
      ...pr,
      weight: convert(pr.weight),
      history: pr.history.map(h => ({ ...h, weight: convert(h.weight) }))
    })));
  };

  const handleLogSet = (exId: string, setIndex: number, weight: number, reps: number) => {
    let loggedSet = false;

    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      const newLogs = [...ex.logs];
      newLogs[setIndex] = { weight, reps, completed: true };
      loggedSet = true;
      return { ...ex, logs: newLogs };
    }));

    if (
      loggedSet &&
      settings.hapticFeedback &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(12);
    }
  };

  const handleUnlogSet = (exId: string, setIndex: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      const newLogs = [...ex.logs];
      if (newLogs[setIndex]) {
        newLogs[setIndex] = undefined;
      }
      return { ...ex, logs: newLogs };
    }));
  };

  const handleAddSet = (exId: string) => {
    const activePlanIdSnapshot = activePlanId;
    const activePlanSnapshot = plans.find((plan) => plan.id === activePlanIdSnapshot);
    const exercise = exercises.find((candidate) => candidate.id === exId);
    const normalizedExerciseName = exercise
      ? normalizePlanExerciseName(exercise.name)
      : null;
    const exerciseIsInActivePlan =
      !!activePlanSnapshot &&
      !!normalizedExerciseName &&
      Object.values(activePlanSnapshot.schedule).some(
        (day: TrainingPlan['schedule'][string]) =>
        (day.exercises ?? []).some(
          (exerciseName) =>
            normalizePlanExerciseName(exerciseName) === normalizedExerciseName
        )
      );

    if (!exercise || !normalizedExerciseName || !exerciseIsInActivePlan) {
      setExercises((prev) =>
        prev.map((candidate) =>
          candidate.id === exId ? { ...candidate, sets: candidate.sets + 1 } : candidate
        )
      );
      return;
    }

    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== activePlanIdSnapshot) {
          return plan;
        }

        const nextCounts = buildPlanExerciseSetCounts(
          plan.schedule,
          plan.exerciseSetCounts
        );
        nextCounts[normalizedExerciseName] =
          (nextCounts[normalizedExerciseName] ?? 2) + 1;

        return {
          ...plan,
          exerciseSetCounts: nextCounts,
        };
      })
    );
  };

  const handleRemoveSet = (exId: string) => {
    const activePlanIdSnapshot = activePlanId;
    const activePlanSnapshot = plans.find((plan) => plan.id === activePlanIdSnapshot);
    const exercise = exercises.find((candidate) => candidate.id === exId);
    const normalizedExerciseName = exercise
      ? normalizePlanExerciseName(exercise.name)
      : null;
    const exerciseIsInActivePlan =
      !!activePlanSnapshot &&
      !!normalizedExerciseName &&
      Object.values(activePlanSnapshot.schedule).some(
        (day: TrainingPlan['schedule'][string]) =>
        (day.exercises ?? []).some(
          (exerciseName) =>
            normalizePlanExerciseName(exerciseName) === normalizedExerciseName
        )
      );

    if (!exercise || !normalizedExerciseName || !exerciseIsInActivePlan) {
      setExercises((prev) =>
        prev.map((candidate) => {
          if (candidate.id !== exId || candidate.sets <= 1) {
            return candidate;
          }

          const nextSets = candidate.sets - 1;
          return {
            ...candidate,
            sets: nextSets,
            logs: candidate.logs.slice(0, nextSets),
            lastLogs: candidate.lastLogs?.slice(0, nextSets),
          };
        })
      );
      return;
    }

    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== activePlanIdSnapshot) {
          return plan;
        }

        const nextCounts = buildPlanExerciseSetCounts(
          plan.schedule,
          plan.exerciseSetCounts
        );
        const currentCount = nextCounts[normalizedExerciseName] ?? 2;
        if (currentCount <= 1) {
          return plan;
        }

        nextCounts[normalizedExerciseName] = currentCount - 1;

        return {
          ...plan,
          exerciseSetCounts: nextCounts,
        };
      })
    );
  };

  const handleSavePlan = (
    newPlan: TrainingPlan,
    exercisePrimaryMuscles: Record<string, PrimaryMuscleGroup>,
    mode: 'create' | 'edit'
  ) => {
    const planWithCounts = {
      ...newPlan,
      exerciseSetCounts: buildPlanExerciseSetCounts(
        newPlan.schedule,
        newPlan.exerciseSetCounts
      ),
    };

    setPlans(prev => {
      if (mode === 'edit') {
        const existingPlan = prev.find((plan) => plan.id === planWithCounts.id);
        if (!existingPlan) {
          return [...prev, planWithCounts];
        }

        return replacePlanById(prev, mergePlanEdits(existingPlan, planWithCounts));
      }

      return [...prev, planWithCounts];
    });

    if (mode === 'create' && !activePlanId) {
      setActivePlanId(planWithCounts.id);
    }
    
    // Ensure all exercise names in the new plan have corresponding Exercise objects
    const newExerciseNames = new Set<string>();
    Object.values(planWithCounts.schedule).forEach(
      (day: TrainingPlan['schedule'][string]) => {
      if (day.exercises) {
        day.exercises.forEach(name => newExerciseNames.add(name));
      }
      }
    );

    setExercises(prev => {
      const existingNames = new Set(prev.map(e => e.name));
      const toAdd: Exercise[] = [];
      newExerciseNames.forEach(name => {
        if (!existingNames.has(name)) {
          toAdd.push({
            id: createId(),
            name: name,
            primaryMuscle:
              exercisePrimaryMuscles[name.toUpperCase()] ?? DEFAULT_PRIMARY_MUSCLE_GROUP,
            sets: 2,
            reps: "8-15",
            logs: []
          });
        }
      });
      return [...prev, ...toAdd];
    });
  };

  const handleRestartPlan = (planId: string) => {
    const plan = plans.find((candidate) => candidate.id === planId);
    if (!plan) {
      return;
    }

    if (!window.confirm(`RESTART ${plan.name} FROM WEEK 1 / DAY 1?`)) {
      return;
    }

    setPlans((prev) =>
      prev.map((candidate) =>
        candidate.id === planId ? restartPlanProgress(candidate) : candidate
      )
    );
  };

  const handleDeletePlan = (planId: string) => {
    const plan = plans.find((candidate) => candidate.id === planId);
    if (!plan) {
      return;
    }

    if (!window.confirm(`DELETE ${plan.name}? THIS CANNOT BE UNDONE.`)) {
      return;
    }

    const result = deletePlanById(plans, planId, activePlanId);
    setPlans(result.plans);
    setActivePlanId(result.activePlanId);
  };

  const handleCompleteWorkout = () => {
    const currentActivePlan = plans.find(p => p.id === activePlanId);
    const currentDayCounter = currentActivePlan?.currentDay || 1;
    const currentTodayName = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][(currentDayCounter - 1) % 7];
    const currentTodaySchedule = currentActivePlan?.schedule[currentTodayName];
    const currentTodayExerciseNames = currentTodaySchedule?.exercises || [];

    const today = getLocalCalendarDateString();
    const currentWeek = currentActivePlan?.currentWeek ?? 1;

    // Update PRs with the highest weight logged today for each exercise
    setPrs(prevPrs =>
      applyWorkoutPrUpdates({
        prs: prevPrs,
        exercises,
        completedExerciseNames: currentTodayExerciseNames,
        date: today,
        plan: currentActivePlan,
        week: currentWeek,
      })
    );

    // Reset only the completed day's exercise logs; preserve unfinished logs on other days.
    setExercises(prev => completeWorkoutExercises(prev, currentTodayExerciseNames));
    // Advance day counter for the active plan
    setPlans(prev => prev.map(p => {
      if (p.id !== activePlanId) return p;
      return advancePlanProgress(p);
    }));
    // Scroll to top
    window.scrollTo(0, 0);
  };

  const handleExportData = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), exercises, prs, plans, activePlanId, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-backup-${getLocalCalendarDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data: ImportedBackupData) => {
    setExercises(data.exercises);
    setPrs(data.prs);
    setPlans(data.plans);
    setActivePlanId(data.activePlanId);
    setSettings(data.settings);
  };

  const applyExerciseManagementState = (nextState: {
    exercises: Exercise[];
    plans: TrainingPlan[];
    prs: PR[];
  }) => {
    setExercises(nextState.exercises);
    setPlans(nextState.plans);
    setPrs(nextState.prs);
  };

  const handleSaveExerciseEdits = ({
    exerciseId,
    nextName,
    nextPrimaryMuscle,
  }: {
    exerciseId: string;
    nextName: string;
    nextPrimaryMuscle: PrimaryMuscleGroup;
  }): { ok: true } | { ok: false; error: string } => {
    const result = saveManagedExerciseEdits({
      exercises,
      plans,
      prs,
      exerciseId,
      nextName,
      nextPrimaryMuscle,
    });

    if (!result.ok) {
      return result;
    }

    applyExerciseManagementState(result);
    return { ok: true };
  };

  const handleDeleteExercise = (exerciseId: string) => {
    applyExerciseManagementState(
      deleteManagedExercise({
        exercises,
        plans,
        prs,
        exerciseId,
      })
    );
  };

  const handleWipeData = () => {
    setExercises(
      INITIAL_EXERCISES.map((exercise) => ({
        ...exercise,
        sets: 2,
      }))
    );
    setPrs(INITIAL_PRS);
    setPlans([]);
    setActivePlanId(null);
    setSettings(DEFAULT_SETTINGS);
  };

  const activePlan = plans.find(p => p.id === activePlanId);
  const planIsComplete = activePlan ? isPlanComplete(activePlan) : false;
  const activePlanProgress = activePlan ? getPlanProgressSnapshot(activePlan) : null;
  const dayCounter = activePlanProgress?.displayDay || 1;
  const todayName = PLAN_DAYS[(dayCounter - 1) % 7];
  const currentWeek = activePlanProgress?.displayWeek ?? Math.ceil(dayCounter / 7);
  const activePlanInDeloadWeek = isDeloadWeek(activePlan, currentWeek);
  const todaySchedule = activePlan?.schedule[todayName];
  
  // Preserve the plan-authored order and skip missing exercise records safely.
  const todayExercises = todaySchedule
    ? buildTodayExercises(todaySchedule.exercises ?? [], exercises)
    : [];

  return (
    <Router>
      <AndroidBackHandler />
      <div className="min-h-screen bg-black text-text-main flex flex-col">
        <Routes>
          <Route path="/" element={
            !activePlan || planIsComplete || !todaySchedule ? (
              <>
                <Header title="NO ACTIVE PLAN" subtitle="AWAITING DIRECTIVES" />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <h2 className="font-display text-4xl text-muted uppercase mb-2">NO PLAN SELECTED</h2>
                  <p className="font-mono text-xs text-muted/60 tracking-widest uppercase mb-12">INITIALIZE A NEW TRAINING PROTOCOL TO BEGIN.</p>
                  
                  <Link to="/plans" className="brutal-btn w-full mb-4">
                    <Plus size={24} />
                    SELECT OR CREATE PLAN
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Header 
                  title={`DAY ${String(dayCounter).padStart(3, '0')}`} 
                  subtitle={`${todayName} • ${activePlanInDeloadWeek ? 'DELOAD • ' : ''}${todaySchedule.type === 'workout' ? (todaySchedule.exercises?.join(' + ') || 'WORKOUT') : 'REST DAY'}`} 
                />
                {todaySchedule.type === 'workout' ? (
                  <DailyGrind 
                    exercises={todayExercises} 
                    activePlan={activePlan}
                    unit={settings.unit}
                    onLogSet={handleLogSet}
                    onCompleteWorkout={handleCompleteWorkout} 
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <h2 className="font-display text-4xl text-muted uppercase mb-2">RECOVERY PROTOCOL</h2>
                    <p className="font-mono text-xs text-muted/60 tracking-widest uppercase mb-12">STAY MOBILE. STAY READY.</p>
                    
                    <button 
                      onClick={handleCompleteWorkout}
                      className="brutal-btn w-full bg-surface border-muted text-muted hover:border-primary hover:text-primary mb-8"
                    >
                      <Check size={24} />
                      COMPLETE DAY & ADVANCE
                    </button>

                    <Link to="/plans" className="text-muted/40 font-bold text-[10px] tracking-[0.3em] hover:text-primary transition-colors uppercase">
                      VIEW FULL SCHEDULE
                    </Link>
                  </div>
                )}
              </>
            )
          } />
          <Route path="/exercise/:id" element={
            <ExerciseLog 
              exercises={exercises} 
              activePlan={activePlan}
              settings={settings}
              onLogSet={handleLogSet} 
              onUnlogSet={handleUnlogSet}
              onAddSet={handleAddSet} 
              onRemoveSet={handleRemoveSet} 
            />
          } />
          <Route path="/plans" element={
            <TrainingPlans 
              plans={plans} 
              activePlanId={activePlanId} 
              onSelectPlan={setActivePlanId} 
              onRestartPlan={handleRestartPlan}
              onDeletePlan={handleDeletePlan}
              dayCounter={dayCounter}
            />
          } />
          <Route
            path="/create-plan"
            element={
              <CreatePlan
                onSave={handleSavePlan}
                plans={plans}
                existingExercises={Array.from(
                  exercises.reduce((accumulator, exercise) => {
                    const normalizedName = exercise.name.toUpperCase();
                    if (!accumulator.has(normalizedName)) {
                      accumulator.set(normalizedName, {
                        name: exercise.name,
                        primaryMuscle: exercise.primaryMuscle,
                      });
                    }
                    return accumulator;
                  }, new Map<string, PlanExerciseOption>()).values()
                )}
              />
            }
          />
          <Route path="/prs" element={
            <React.Suspense fallback={<div className="flex-1 bg-black" />}>
              <PRVaultPage prs={prs} settings={settings} exercises={exercises} />
            </React.Suspense>
          } />
          <Route
            path="/settings"
            element={
              <SettingsPage
                settings={settings}
                setSettings={setSettings}
                exercises={exercises}
                onToggleUnit={handleToggleUnit}
                onWipeData={handleWipeData}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onSaveExerciseEdits={handleSaveExerciseEdits}
                onDeleteExercise={handleDeleteExercise}
              />
            }
          />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}
