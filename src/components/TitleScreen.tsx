/**
 * Blackfree: Anomaly Protocol - Title Screen & Origin Selection
 * Bespoke inline SVG lockup, origin choice terminal, and keyboard accessibility.
 */

import React, { useState, useEffect } from 'react';
import { OriginType } from '../types.ts';

interface TitleScreenProps {
  onStartGame: (origin: OriginType) => void;
  highScore: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, highScore }) => {
  const [selectedOrigin, setSelectedOrigin] = useState<OriginType>('chrono');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame(selectedOrigin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrigin, onStartGame]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 md:p-12 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/95 text-white select-none">
      {/* Top Bar Metadata */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold tracking-widest uppercase">System Protocol v4.0</span>
          <span>·</span>
          <span>Sector-07 Quarantine City</span>
        </div>
        <div className="flex items-center gap-4">
          <span>HIGH SCORE: <strong className="text-amber-400 tabular-nums">{highScore} PTS</strong></span>
        </div>
      </div>

      {/* Center Hero Lockup & Origin Terminal */}
      <div className="max-w-4xl mx-auto w-full my-auto flex flex-col items-center text-center">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-6 flex flex-col items-center">
          <svg className="w-64 h-16 md:w-80 md:h-20" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 20 L40 60 L60 20 L80 60 L100 20" stroke="#06B6D4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M120 20 L160 20 M140 20 L140 60" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
            <path d="M180 60 L180 20 L210 20 L210 40 L180 40 M195 40 L215 60" stroke="#EC4899" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="260" cy="40" r="18" stroke="#8B5CF6" strokeWidth="4" strokeDasharray="6 4" />
          </svg>
          <h1 className="text-4xl md:text-6xl font-mono font-black tracking-tight text-white uppercase mt-2">
            BLACKFREE
          </h1>
          <p className="text-sm md:text-base font-mono text-cyan-400/90 tracking-widest mt-1">
            // ANOMALY PROTOCOL · MUTATING SENTIENT COMBAT
          </p>
        </div>

        {/* Origin Choice Description */}
        <div className="w-full max-w-2xl text-left bg-slate-900/90 border border-slate-800 p-6 shadow-2xl mb-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Pillar 1: Pick Baseline Relationship with Physics
            </span>
            <span className="text-xs font-mono text-cyan-400">SELECT ORIGIN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* The Chrono Origin Card */}
            <button
              onClick={() => setSelectedOrigin('chrono')}
              className={`p-4 text-left border transition-all cursor-pointer ${
                selectedOrigin === 'chrono'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-900/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-sm font-bold text-white">THE CHRONO ORIGIN</h3>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">Time Control</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
                Dilation field slows down the world by 50%. Step through enemy projectile clouds frame-by-frame, execute razor-sharp Katana parries, and out-run physical momentum.
              </p>
              <div className="text-[11px] font-mono text-cyan-300">
                Primary: Tachyon Dilation (Q) · Reflex Phase
              </div>
            </button>

            {/* The Vector Origin Card */}
            <button
              onClick={() => setSelectedOrigin('vector')}
              className={`p-4 text-left border transition-all cursor-pointer ${
                selectedOrigin === 'vector'
                  ? 'bg-violet-950/40 border-violet-400 shadow-md shadow-violet-900/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-sm font-bold text-white">THE VECTOR ORIGIN</h3>
                <span className="text-[10px] font-mono text-violet-400 uppercase font-semibold">Gravity Control</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
                Alters directional pulling forces. Allows ceiling runs, high-speed kinetic wall-running, and gravity-wells that solidify enemy bullet trails into climbable light ramps.
              </p>
              <div className="text-[11px] font-mono text-violet-300">
                Primary: Graviton Vortex (E) · Tensor Wall-Drive
              </div>
            </button>
          </div>
        </div>

        {/* Primary Start CTA */}
        <button
          onClick={() => onStartGame(selectedOrigin)}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-sm uppercase px-8 py-3.5 tracking-wider border border-cyan-300 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer"
        >
          INITIALIZE ANOMALY PROTOCOL (ENTER)
        </button>
      </div>

      {/* Flat Control Hints Bar */}
      <div className="w-full text-center text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-4">
        <span>WASD Move · Space Jump/Wall-Kick · Shift/C Slide · LMB Attack/Fire · RMB ADS/Guard · 1-4 Weapons · Q/E Origin Powers · Tab Sentient Tree · Esc Pause</span>
      </div>
    </div>
  );
};
