/**
 * Blackfree: Anomaly Protocol - Pause & Directives Modal
 */

import React from 'react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 text-white select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Simulation Suspended</span>
            <h3 className="text-xl font-mono font-bold text-white mt-0.5">TACTICAL DIRECTIVES</h3>
          </div>
          <button
            onClick={onToggleMute}
            className="text-xs font-mono px-3 py-1.5 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            AUDIO: {isMuted ? 'MUTED' : 'ACTIVE'}
          </button>
        </div>

        {/* Controls Cheatsheet */}
        <div className="space-y-2 font-mono text-xs mb-6">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">WASD</span>
            <span className="text-white">Omni-Directional Sprint</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Space</span>
            <span className="text-white">Jump / Wall-Kick (Buffer & Coyote Active)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Left Shift / C</span>
            <span className="text-white">High-Speed Slide / Bunny Hop</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Left Click</span>
            <span className="text-white">Fire Weapon / Katana Slash</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Right Click</span>
            <span className="text-white">ADS Zoom / Katana Guard Window</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Katana + Enemy Bullet</span>
            <span className="text-cyan-400 font-bold">ULTRAKILL Frame Parry (Deflects 2.5x Dmg)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">1 / 2 / 3 / 4 or Wheel</span>
            <span className="text-white">Katana · Rifle · Revolver · Shotgun</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Q / E</span>
            <span className="text-purple-400">Origin Powers (Time Slow / Gravity Well)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Tab / K</span>
            <span className="text-white">Open Sentient Mutation Tree</span>
          </div>
        </div>

        {/* Resume Button */}
        <button
          onClick={onResume}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase py-3 border border-cyan-300 shadow-md transition-colors cursor-pointer"
        >
          RESUME OPERATION (ESC)
        </button>
      </div>
    </div>
  );
};
