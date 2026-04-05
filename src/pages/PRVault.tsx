import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Header } from '../components/Header';
import {
  ALL_PR_FILTER,
  filterPrsByExercise,
  getPrChartDomain,
  getPrFilterOptions,
  togglePrExerciseFilter,
} from '../lib/pr-vault';
import { cn } from '../lib/utils';
import type { PR, Settings } from '../types';

export default function PRVault({ prs, settings }: { prs: PR[]; settings: Settings }) {
  const filters = getPrFilterOptions(prs);
  const workoutFilters = filters.filter(filter => filter !== ALL_PR_FILTER);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => workoutFilters);
  const filteredPrs = filterPrsByExercise(prs, selectedFilters);
  const areAllFiltersSelected = workoutFilters.length > 0 && selectedFilters.length === workoutFilters.length;

  useEffect(() => {
    setSelectedFilters(current => {
      const next = workoutFilters.filter(filter => current.includes(filter));

      if (next.length === current.length && next.every((filter, index) => filter === current[index])) {
        return current;
      }

      return next;
    });
  }, [workoutFilters]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col"
    >
      <Header title="PR VAULT" />

      <div className="px-4 py-6 overflow-x-auto whitespace-nowrap flex gap-4 border-b-2 border-muted">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setSelectedFilters(current => togglePrExerciseFilter(current, f, filters))}
            className={cn(
              "px-5 py-2 font-display text-lg sm:text-xl rounded-sm border-2 transition-none min-h-11",
              (f === ALL_PR_FILTER ? areAllFiltersSelected : selectedFilters.includes(f))
                ? "bg-primary text-black border-primary shadow-brutal"
                : "bg-surface text-text-main border-muted hover:border-primary"
            )}
            aria-pressed={f === ALL_PR_FILTER ? areAllFiltersSelected : selectedFilters.includes(f)}
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
          filteredPrs.map(pr => {
            const chartDomain = getPrChartDomain(pr.history);

            return (
              <div key={pr.exerciseId} className="relative bg-surface rounded-sm brutal-border p-4 flex flex-col justify-between min-h-[160px] overflow-hidden group hover:border-secondary transition-none">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pr.history} margin={{ top: 12, right: 0, bottom: 12, left: 0 }}>
                      <YAxis type="number" domain={chartDomain.domain} hide />
                      <Line type="monotone" dataKey="weight" stroke="#00FFFF" strokeWidth={4} dot={false} isAnimationActive={false} />
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
            );
          })
        )}
      </main>
    </motion.div>
  );
}
