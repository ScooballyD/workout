import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import type { PR, Settings } from '../types';

const Header = ({ title }: { title: string }) => (
  <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b-2 border-muted p-4 pt-8">
    <h1 className="text-[64px] font-display font-bold leading-none tracking-tighter text-text-main m-0 p-0 uppercase">
      {title}
    </h1>
  </header>
);

export default function PRVault({ prs, settings }: { prs: PR[]; settings: Settings }) {
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
          filteredPrs.map(pr => (
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
}
