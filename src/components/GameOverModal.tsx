/**
 * Blackfree: Anomaly Protocol - Elimination & System Collapse Modal
 * Roguelike post-run breakdown for Pillar 3's Random Force reset loop.
 */

import React, { useEffect } from 'react';
import { GameStats } from '../types.ts';

interface GameOverModalProps {
  stats: GameStats;
  reason: 'elimination' | 'system_wipe';
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, reason, onRestart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  const isWipe = reason === 'system_wipe';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 text-white select-none">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl p-8 shadow-2xl flex flex-col text-center">
        {/* Header Indicator */}
        <div className="mb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
            {isWipe ? 'Pillar 3: The Random Force' : 'Combat Feedback'}
          </span>
          <h2 className={`text-3xl font-mono font-black mt-1 ${isWipe ? 'text-rose-500' : 'text-amber-500'}`}>
            {isWipe ? 'SYSTEM INSTABILITY COLLAPSE' : 'NEURAL LINK SEVERED'}
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            {isWipe
              ? 'The universe frayed beyond containment. A sudden spatial tear erased your timeline.'
              : 'Overwhelmed by evolving AI combatants in Sector-07.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/80 border border-slate-800 p-4 mb-6 text-left font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Enemies Neutralized</span>
            <div className="text-xl font-bold text-white tabular-nums">{stats.kills}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Style Rank Achieved</span>
            <div className="text-xl font-bold text-cyan-400">{stats.styleRank}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Style Score</span>
            <div className="text-xl font-bold text-amber-400 tabular-nums">+{stats.stylePoints}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">AI Generation Witnessed</span>
            <div className="text-xl font-bold text-purple-400 tabular-nums">GEN {stats.aiGeneration}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Time Survived</span>
            <div className="text-xl font-bold text-slate-300 tabular-nums">{stats.timeSurvived.toFixed(1)}s</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Shards Collected</span>
            <div className="text-xl font-bold text-emerald-400 tabular-nums">{stats.evolutionShards}</div>
          </div>
        </div>

        {/* Restart Action */}
        <button
          onClick={onRestart}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-sm uppercase px-8 py-3.5 tracking-wider border border-cyan-300 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer"
        >
          REINITIALIZE PROTOCOL (ENTER)
        </button>

        <span className="text-[11px] font-mono text-slate-500 mt-3">
          Progress and unlocked mutations persist into neural memory.
        </span>
      </div>
    </div>
  );
};
