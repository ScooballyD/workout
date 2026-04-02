/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Lock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from './lib/utils';
import { Exercise, PR, TrainingPlan, Settings, SetLog } from './types';
import { INITIAL_EXERCISES, INITIAL_PRS } from './constants';

// --- Components ---

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

const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b-2 border-muted p-4 pt-8">
    <h1 className="text-[64px] font-display font-bold leading-none tracking-tighter text-text-main m-0 p-0 uppercase">
      {title}
    </h1>
    {subtitle && <p className="text-primary text-xl font-bold tracking-widest mt-2 uppercase">{subtitle}</p>}
  </header>
);

// --- Pages ---

const DailyGrind = ({ 
  exercises, 
  activePlan,
  onLogSet,
  onCompleteWorkout 
}: { 
  exercises: Exercise[], 
  activePlan?: TrainingPlan,
  onLogSet: (id: string, setIndex: number, weight: number, reps: number) => void,
  onCompleteWorkout: () => void 
}) => {
  const isCompleted = (ex: Exercise) => ex.logs.filter(l => l?.completed).length >= ex.sets;
  const activeIndex = exercises.findIndex(ex => !isCompleted(ex));
  const activeExercise = exercises[activeIndex];
  const allCompleted = activeIndex === -1;

  const autoIncrement = activePlan?.advanced?.autoIncrement || false;
  const currentWeek = activePlan?.currentWeek || 1;

  const getNextSetInfo = (exercise: Exercise) => {
    let actualSetIndex = 0;
    for (let i = 0; i < exercise.sets; i++) {
      if (!exercise.logs[i]?.completed) {
        actualSetIndex = i;
        break;
      }
    }

    let defaultWeight = exercise.recommended?.weight || 0;
    let defaultReps = exercise.recommended?.reps || 0;

    const lastLog = exercise.lastLogs?.[actualSetIndex];
    if (lastLog) {
      defaultWeight = lastLog.weight;
      defaultReps = lastLog.reps + (autoIncrement ? 1 : 0);
    } else if (autoIncrement && currentWeek > 1) {
      defaultReps += (currentWeek - 1);
    }

    return { actualSetIndex, defaultWeight, defaultReps };
  };

  const handleLogNextSet = () => {
    if (!activeExercise) return;
    const { actualSetIndex, defaultWeight, defaultReps } = getNextSetInfo(activeExercise);
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

      <div className="flex flex-col gap-4">
        {exercises.map((ex, idx) => {
          const completed = isCompleted(ex);
          const isActive = idx === activeIndex;
          const nextSetInfo = getNextSetInfo(ex);
          const displayReps = completed ? ex.reps : nextSetInfo.defaultReps || ex.reps;
          
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
                    <span className="block text-xs text-muted/60 mb-1">REPS</span>
                    <span className={cn("text-lg", (isActive || completed) ? "text-text-main" : "text-muted")}>{displayReps}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: ex.sets }).map((_, i) => (
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

  const getDefaultForSet = (ex: Exercise, i: number) => {
    let weight = ex.recommended?.weight || 0;
    let reps = ex.recommended?.reps || 0;
    const lastLog = ex.lastLogs?.[i];
    if (lastLog) {
      weight = lastLog.weight;
      reps = lastLog.reps + (autoIncrement ? 1 : 0);
    } else if (autoIncrement && currentWeek > 1) {
      reps += (currentWeek - 1);
    }
    return { weight, reps };
  };

  const [inputValues, setInputValues] = useState<{ weight: number; reps: number }[]>(
    () => exercise ? Array.from({ length: exercise.sets }, (_, i) => getDefaultForSet(exercise, i)) : []
  );

  // Keep inputValues in sync when sets are added or removed
  useEffect(() => {
    if (!exercise) return;
    setInputValues((prev: { weight: number; reps: number }[]) => Array.from({ length: exercise.sets }, (_, i) =>
      prev[i] ?? getDefaultForSet(exercise, i)
    ));
  }, [exercise?.sets]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!exercise) return <div>Exercise not found</div>;

  const handleWeightChange = (i: number, value: number) => {
    setInputValues((prev: { weight: number; reps: number }[]) => {
      const next = [...prev];
      next[i] = { ...next[i], weight: value };
      if (settings.matchWeight) {
        for (let j = i + 1; j < exercise.sets; j++) {
          if (!exercise.logs[j]?.completed) {
            next[j] = { ...next[j], weight: value };
          }
        }
      }
      return next;
    });
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
          {exercise.recommended && (
            <div className="text-secondary text-sm tracking-widest font-bold bg-surface px-3 py-1 rounded border-2 border-muted">
              REC: {exercise.recommended.weight}{settings.unit.toUpperCase()} x {exercise.recommended.reps}
            </div>
          )}
        </div>
        <h1 className="text-white text-[48px] font-bold leading-[1.1] tracking-tighter uppercase">
          {exercise.name.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
        </h1>
      </header>

      <main className="flex-1 p-4 pb-24 flex flex-col gap-4">
        <div className="flex text-muted text-xs font-bold px-2 tracking-widest mb-2">
          <div className="w-12">SET</div>
          <div className="flex-1 text-center">{settings.unit.toUpperCase()}</div>
          <div className="flex-1 text-center">REPS</div>
          <div className="w-16 text-center">LOG</div>
        </div>

        {Array.from({ length: exercise.sets }).map((_, i) => {
          const log = exercise.logs[i];
          const isNext = i === exercise.logs.length;
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValues((prev: { weight: number; reps: number }[]) => {
                  const next = [...prev];
                  next[i] = { ...next[i], reps: Number(e.target.value) };
                  return next;
                })}
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

const PRVault = ({ prs, settings }: { prs: PR[], settings: Settings }) => {
  const [filter, setFilter] = useState('ALL');
  const filteredPrs = filter === 'ALL' ? prs : prs.filter(p => p.exerciseName.includes(filter));

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col"
    >
      <Header title="PR VAULT" />
      
      <div className="px-4 py-6 overflow-x-auto whitespace-nowrap flex gap-4 border-b-2 border-muted">
        {['ALL', 'SQUAT', 'BENCH', 'DEADLIFT'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-6 py-2 font-display text-xl rounded-sm border-2 transition-none",
              filter === f ? "bg-primary text-black border-primary shadow-brutal" : "bg-surface text-text-main border-muted hover:border-primary"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <main className="p-4 grid grid-cols-2 gap-4 auto-rows-max pb-32">
        {filteredPrs.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-muted rounded-sm">
            <Trophy size={48} className="text-muted mb-4" />
            <p className="text-muted font-bold tracking-widest uppercase">NO DATA AVAILABLE</p>
            <p className="text-xs text-muted mt-2">LOG SETS TO TRACK YOUR PROGRESS</p>
          </div>
        ) : (
          filteredPrs.map((pr) => (
            <div key={pr.exerciseId} className="relative bg-surface rounded-sm brutal-border p-4 flex flex-col justify-between min-h-[160px] overflow-hidden group hover:border-secondary transition-none">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pr.history}>
                    <Line type="monotone" dataKey="weight" stroke="#00FFFF" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="relative z-10 flex justify-between items-start mb-4">
                <span className="text-xs text-muted font-bold tracking-widest">{pr.exerciseName}</span>
                {pr.date === new Date().toISOString().split('T')[0] && (
                  <span className="bg-secondary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm">NEW PR</span>
                )}
              </div>
              <div className="relative z-10 mt-auto">
                <div className="text-4xl font-display font-bold text-text-main leading-none tracking-tighter">{pr.weight}</div>
                <div className="text-sm text-secondary font-bold mt-1">{settings.unit.toUpperCase()}</div>
                <div className="text-[10px] text-muted mt-2 font-mono">{pr.date}</div>
              </div>
            </div>
          ))
        )}
      </main>
    </motion.div>
  );
};

const TrainingPlans = ({ plans, activePlanId, onSelectPlan, dayCounter }: { 
  plans: TrainingPlan[], 
  activePlanId: string | null,
  onSelectPlan: (id: string) => void,
  dayCounter: number
}) => {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const navigate = useNavigate();
  const activePlan = plans.find(p => p.id === activePlanId);
  const currentWeek = activePlan ? Math.ceil(dayCounter / 7) : 0;
  const todayName = activePlan ? days[(dayCounter - 1) % 7] : "";

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
                <p className="font-mono text-primary text-sm mt-1 uppercase">WEEK {currentWeek} OF {activePlan.durationWeeks}</p>
              </div>
              <div className="bg-primary text-black px-2 py-1 font-display text-sm">ACTIVE</div>
            </div>
            <div className="grid grid-cols-12 gap-1 mb-4">
              {Array.from({ length: activePlan.durationWeeks }).map((_, i) => (
                <div key={i} className={cn("h-2", i < currentWeek ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <div className="flex justify-between items-center font-mono text-[10px] text-muted">
              <span>PROGRESS: {Math.round((currentWeek / activePlan.durationWeeks) * 100)}%</span>
              <span>{Math.max(0, activePlan.durationWeeks - currentWeek)} WEEKS REMAINING</span>
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
              <button 
                key={p.id}
                onClick={() => onSelectPlan(p.id)}
                className={cn(
                  "flex items-center justify-between p-4 border-2 rounded transition-all text-left",
                  p.id === activePlanId ? "border-primary bg-primary/5" : "border-muted bg-surface hover:border-primary"
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("font-display text-xl leading-none", p.id === activePlanId ? "text-primary" : "text-text-main")}>{p.name}</span>
                  <span className="font-mono text-[10px] text-muted mt-1 uppercase">WEEK {p.currentWeek} • DAY {String(p.currentDay).padStart(3, '0')}</span>
                </div>
                {p.id === activePlanId && <Check size={20} className="text-primary" />}
              </button>
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
            {days.map((day, i) => {
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

const CreatePlan = ({ onSave, existingExercises }: { onSave: (plan: TrainingPlan) => void, existingExercises: string[] }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(4);
  const [schedule, setSchedule] = useState<{ [key: string]: { type: 'workout' | 'rest', exercises: string[], description: string } }>({
    "MON": { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
    "TUE": { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
    "WED": { type: 'rest', exercises: [], description: 'RECOVERY & MOBILITY' },
    "THU": { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
    "FRI": { type: 'workout', exercises: [], description: 'ASSIGN ROUTINE' },
    "SAT": { type: 'rest', exercises: [], description: 'ACTIVE RECOVERY' },
    "SUN": { type: 'rest', exercises: [], description: 'REST DAY' },
  });
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [workoutInput, setWorkoutInput] = useState('');

  const handleAddWorkout = (day: string) => {
    if (!workoutInput) {
      setEditingDay(null);
      return;
    }
    setSchedule(prev => ({
      ...prev,
      [day]: { 
        ...prev[day], 
        exercises: [...prev[day].exercises, workoutInput.toUpperCase()],
        description: prev[day].exercises.length === 0 ? workoutInput.toUpperCase() : `${prev[day].description}, ${workoutInput.toUpperCase()}`
      }
    }));
    setEditingDay(null);
    setWorkoutInput('');
  };

  const handleSave = () => {
    if (!name) return alert("PLEASE ENTER A PLAN NAME");
    const newPlan: TrainingPlan = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.toUpperCase(),
      durationWeeks: duration,
      currentWeek: 1,
      currentDay: 1,
      schedule,
      advanced: {
        autoIncrement
      }
    };
    onSave(newPlan);
    navigate('/plans');
  };

  const toggleDay = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        type: prev[day].type === 'workout' ? 'rest' : 'workout',
        exercises: [],
        description: prev[day].type === 'workout' ? 'REST DAY' : 'ASSIGN ROUTINE'
      }
    }));
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
          <h1 className="font-display font-black italic tracking-tighter text-primary text-xl uppercase">NEW PLAN</h1>
        </div>
        <button 
          onClick={handleSave}
          className="text-primary font-bold text-sm tracking-widest hover:bg-primary hover:text-black transition-colors px-3 py-1 border-2 border-transparent active:translate-x-[1px] active:translate-y-[1px] uppercase"
        >
          SAVE
        </button>
      </header>

      <main className="flex-grow p-4 space-y-8 max-w-2xl mx-auto w-full">
        <div className="relative h-48 w-full border-2 border-muted overflow-hidden group">
          <img 
            alt="Workout gear" 
            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
          <div className="absolute bottom-4 left-4">
            <p className="text-[48px] font-display font-black tracking-tighter leading-none text-primary uppercase">KINETIC<br/>VOLT</p>
          </div>
        </div>

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
                                  ...prev[day],
                                  exercises: prev[day].exercises.filter((_, i) => i !== idx)
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
                          {workoutInput && existingExercises.filter(ex => ex.toUpperCase().includes(workoutInput.toUpperCase()) && ex.toUpperCase() !== workoutInput.toUpperCase()).length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-surface border-2 border-primary z-50 max-h-32 overflow-y-auto">
                              {existingExercises.filter(ex => ex.toUpperCase().includes(workoutInput.toUpperCase()) && ex.toUpperCase() !== workoutInput.toUpperCase()).map(ex => (
                                <button
                                  key={ex}
                                  className="w-full text-left px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary hover:text-black uppercase"
                                  onClick={() => {
                                    setWorkoutInput(ex);
                                  }}
                                >
                                  {ex}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingDay(day); setWorkoutInput(''); }}
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
          </div>
          <div className="bg-black/40 p-4 border-l-4 border-primary">
            <p className="text-[10px] leading-tight text-muted uppercase">PLAN SUMMARY</p>
            <p className="text-lg font-black mt-1 uppercase">
              {(Object.values(schedule) as { type: string }[]).filter(s => s.type === 'workout').length} DAYS/WEEK • {duration} WEEKS
            </p>
            <p className="text-[10px] text-primary mt-2 italic uppercase">INTENSITY: HIGH PERFORMANCE HUD ENABLED</p>
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

const SettingsPage = ({ settings, setSettings, onToggleUnit, onWipeData, onExportData, onImportData }: { settings: Settings, setSettings: React.Dispatch<React.SetStateAction<Settings>>, onToggleUnit: () => void, onWipeData: () => void, onExportData: () => void, onImportData: (data: object) => void }) => {
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        onImportData(data);
      } catch {
        alert('INVALID BACKUP FILE');
      }
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
            className={cn("w-20 h-10 rounded-sm relative transition-colors", settings.unit === 'lbs' ? "bg-muted" : "bg-primary")}
          >
            <div className={cn("absolute top-1 w-8 h-8 bg-white rounded-sm transition-all", settings.unit === 'lbs' ? "left-1" : "left-11")} />
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
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    try { const s = localStorage.getItem('workout_exercises'); return s ? JSON.parse(s) : INITIAL_EXERCISES; } catch { return INITIAL_EXERCISES; }
  });
  const [prs, setPrs] = useState<PR[]>(() => {
    try { const s = localStorage.getItem('workout_prs'); return s ? JSON.parse(s) : INITIAL_PRS; } catch { return INITIAL_PRS; }
  });
  const [plans, setPlans] = useState<TrainingPlan[]>(() => {
    try { const s = localStorage.getItem('workout_plans'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    try { return localStorage.getItem('workout_activePlanId') || null; } catch { return null; }
  });
  const [settings, setSettings] = useState<Settings>(() => {
    try { const s = localStorage.getItem('workout_settings'); return s ? JSON.parse(s) : { unit: 'lbs', hapticFeedback: true, matchWeight: false }; } catch { return { unit: 'lbs', hapticFeedback: true, matchWeight: false }; }
  });

  useEffect(() => { localStorage.setItem('workout_exercises', JSON.stringify(exercises)); }, [exercises]);
  useEffect(() => { localStorage.setItem('workout_prs', JSON.stringify(prs)); }, [prs]);
  useEffect(() => { localStorage.setItem('workout_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { if (activePlanId) localStorage.setItem('workout_activePlanId', activePlanId); else localStorage.removeItem('workout_activePlanId'); }, [activePlanId]);
  useEffect(() => { localStorage.setItem('workout_settings', JSON.stringify(settings)); }, [settings]);

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
      logs: ex.logs.map(log => ({ ...log, weight: convert(log.weight) })),
      lastLogs: ex.lastLogs?.map(log => ({ ...log, weight: convert(log.weight) }))
    })));

    setPrs(prev => prev.map(pr => ({
      ...pr,
      weight: convert(pr.weight),
      history: pr.history.map(h => ({ ...h, weight: convert(h.weight) }))
    })));
  };

  const handleLogSet = (exId: string, setIndex: number, weight: number, reps: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      const newLogs = [...ex.logs];
      newLogs[setIndex] = { weight, reps, completed: true };
      return { ...ex, logs: newLogs };
    }));
  };

  const handleUnlogSet = (exId: string, setIndex: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      const newLogs = [...ex.logs];
      if (newLogs[setIndex]) {
        newLogs[setIndex] = { ...newLogs[setIndex], completed: false };
      }
      return { ...ex, logs: newLogs };
    }));
  };

  const handleAddSet = (exId: string) => {
    setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, sets: ex.sets + 1 } : ex));
  };

  const handleRemoveSet = (exId: string) => {
    setExercises(prev => prev.map(ex => ex.id === exId && ex.sets > 1 ? { ...ex, sets: ex.sets - 1 } : ex));
  };

  const handleSavePlan = (newPlan: TrainingPlan) => {
    setPlans(prev => [...prev, newPlan]);
    if (!activePlanId) {
      setActivePlanId(newPlan.id);
    }
    
    // Ensure all exercise names in the new plan have corresponding Exercise objects
    const newExerciseNames = new Set<string>();
    Object.values(newPlan.schedule).forEach(day => {
      if (day.exercises) {
        day.exercises.forEach(name => newExerciseNames.add(name));
      }
    });

    setExercises(prev => {
      const existingNames = new Set(prev.map(e => e.name));
      const toAdd: Exercise[] = [];
      newExerciseNames.forEach(name => {
        if (!existingNames.has(name)) {
          toAdd.push({
            id: Math.random().toString(36).substring(2, 11),
            name: name,
            sets: 3,
            reps: "8-15",
            logs: []
          });
        }
      });
      return [...prev, ...toAdd];
    });
  };

  const handleCompleteWorkout = () => {
    const currentActivePlan = plans.find(p => p.id === activePlanId);
    const currentDayCounter = currentActivePlan?.currentDay || 1;
    const currentTodayName = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][(currentDayCounter - 1) % 7];
    const currentTodaySchedule = currentActivePlan?.schedule[currentTodayName];
    const currentTodayExerciseNames = currentTodaySchedule?.exercises || [];

    const today = new Date().toISOString().split('T')[0];

    // Update PRs with the highest weight logged today for each exercise
    setPrs(prevPrs => {
      let updatedPrs = [...prevPrs];
      
      exercises.forEach(ex => {
        const wasInToday = currentTodayExerciseNames.includes(ex.name);
        if (wasInToday && ex.logs.some(l => l?.completed)) {
          const maxWeight = Math.max(...ex.logs.filter(l => l?.completed).map(l => l.weight));
          
          const existingPrIndex = updatedPrs.findIndex(p => p.exerciseName.toUpperCase() === ex.name.toUpperCase());
          
          if (existingPrIndex >= 0) {
            const existingPr = updatedPrs[existingPrIndex];
            const isNewPr = maxWeight > existingPr.weight;
            const newHistory = [...existingPr.history, { weight: maxWeight, date: today }];
            if (newHistory.length > 60) {
              newHistory.shift();
            }
            updatedPrs[existingPrIndex] = {
              ...existingPr,
              weight: isNewPr ? maxWeight : existingPr.weight,
              date: isNewPr ? today : existingPr.date,
              history: newHistory
            };
          } else {
            updatedPrs.push({
              exerciseId: ex.id,
              exerciseName: ex.name,
              weight: maxWeight,
              date: today,
              history: [{ weight: maxWeight, date: today }]
            });
          }
        }
      });
      
      return updatedPrs;
    });

    // Reset exercise logs for the next day
    setExercises(prev => prev.map(ex => {
      const wasInToday = currentTodayExerciseNames.includes(ex.name);
      return { 
        ...ex, 
        lastLogs: (wasInToday && ex.logs.length > 0) ? ex.logs : ex.lastLogs,
        logs: [] 
      };
    }));
    // Advance day counter for the active plan
    setPlans(prev => prev.map(p => {
      if (p.id !== activePlanId) return p;
      const nextDay = p.currentDay + 1;
      return { 
        ...p, 
        currentDay: nextDay,
        currentWeek: Math.ceil(nextDay / 7)
      };
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
    a.download = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data: Record<string, unknown>) => {
    if (!data.exercises || !data.plans || !data.settings) {
      alert('INVALID BACKUP FILE: missing required fields');
      return;
    }
    setExercises(data.exercises as Exercise[]);
    setPrs((data.prs as PR[]) || []);
    setPlans(data.plans as TrainingPlan[]);
    setActivePlanId((data.activePlanId as string) || null);
    setSettings(data.settings as Settings);
  };

  const handleWipeData = () => {
    setExercises(INITIAL_EXERCISES);
    setPrs(INITIAL_PRS);
    setPlans([]);
    setActivePlanId(null);
    setSettings({ unit: 'lbs', hapticFeedback: true, matchWeight: false });
  };

  const activePlan = plans.find(p => p.id === activePlanId);
  const dayCounter = activePlan?.currentDay || 1;
  const DAYS_MAP = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const todayName = DAYS_MAP[(dayCounter - 1) % 7];
  const currentWeek = Math.ceil(dayCounter / 7);
  const todaySchedule = activePlan?.schedule[todayName];
  
  // Filter exercises to only show those assigned to today in the active plan
  const todayExercises = todaySchedule ? exercises.filter(ex => 
    todaySchedule.exercises?.includes(ex.name)
  ) : [];

  return (
    <Router>
      <div className="min-h-screen bg-black text-text-main flex flex-col">
        <Routes>
          <Route path="/" element={
            !activePlan || !todaySchedule ? (
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
                  subtitle={`${todayName} • ${todaySchedule.type === 'workout' ? (todaySchedule.exercises?.join(' + ') || 'WORKOUT') : 'REST DAY'}`} 
                />
                {todaySchedule.type === 'workout' ? (
                  <DailyGrind 
                    exercises={todayExercises} 
                    activePlan={activePlan}
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
              dayCounter={dayCounter}
            />
          } />
          <Route path="/create-plan" element={<CreatePlan onSave={handleSavePlan} existingExercises={Array.from(new Set(exercises.map(e => e.name)))} />} />
          <Route path="/prs" element={<PRVault prs={prs} settings={settings} />} />
          <Route path="/settings" element={<SettingsPage settings={settings} setSettings={setSettings} onToggleUnit={handleToggleUnit} onWipeData={handleWipeData} onExportData={handleExportData} onImportData={handleImportData} />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}
