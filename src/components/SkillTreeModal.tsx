/**
 * Blackfree: Anomaly Protocol - Sentient Skill Tree Modal
 * Interactive node graph with active point spending and passive autonomous mutations.
 */

import React from 'react';
import { SkillNode } from '../types.ts';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: SkillNode[];
  evolutionShards: number;
  onUnlockNode: (nodeId: string) => void;
  onForceMutation: () => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  isOpen,
  onClose,
  nodes,
  evolutionShards,
  onUnlockNode,
  onForceMutation,
}) => {
  if (!isOpen) return null;

  const chronoNodes = nodes.filter((n) => n.origin === 'chrono');
  const vectorNodes = nodes.filter((n) => n.origin === 'vector');
  const hybridNodes = nodes.filter((n) => n.origin === 'hybrid');

  const renderNodeCard = (node: SkillNode) => {
    const isMutated = node.mutated;
    const canUnlock = !node.unlocked && evolutionShards >= node.cost;

    return (
      <div
        key={node.id}
        className={`p-4 border transition-all flex flex-col justify-between ${
          isMutated
            ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/30'
            : node.unlocked
            ? 'bg-slate-900/90 border-cyan-500/80 shadow-sm shadow-cyan-950/30'
            : 'bg-slate-950/70 border-slate-800 opacity-80'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Tier {node.tier} · {node.origin}
              </span>
              <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                {node.name}
                {isMutated && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/30 text-purple-300 border border-purple-400 font-mono">
                    SENTIENT MUTATION
                  </span>
                )}
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {node.unlocked ? 'UNLOCKED' : `${node.cost} SHARDS`}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
            {node.description}
          </p>

          {/* Mutated Override Notice */}
          {isMutated && node.mutationDescription && (
            <div className="p-2.5 bg-purple-900/30 border border-purple-500/60 text-xs font-mono text-purple-200 mb-3">
              {node.mutationDescription}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {!node.unlocked ? (
            <button
              onClick={() => onUnlockNode(node.id)}
              disabled={!canUnlock}
              className={`w-full py-1.5 px-3 text-xs font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                canUnlock
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-cyan-400'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              {evolutionShards < node.cost ? 'Insufficient Shards' : 'Unlock Technique'}
            </button>
          ) : (
            <div className="text-center py-1 text-[11px] font-mono text-cyan-400">
              ✓ Active in Neural Matrix
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Pillar 1 Architecture</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs font-mono text-purple-400">Autonomous Neural Adaptation</span>
            </div>
            <h2 className="text-xl font-mono font-bold text-white mt-0.5">
              THE SENTIENT SKILL MATRIX
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-xs">
              <span className="text-slate-400">AVAILABLE SHARDS: </span>
              <strong className="text-cyan-400 tabular-nums">{evolutionShards}</strong>
            </div>

            <button
              onClick={onForceMutation}
              className="bg-purple-900/60 hover:bg-purple-800 border border-purple-500 text-purple-200 text-xs font-mono px-3 py-1.5 transition-colors cursor-pointer"
              title="Force an autonomous mutation to simulate the tree's passive sentience"
            >
              ⚡ Force Mutation Pulse
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono px-3 py-1.5 border border-slate-600 cursor-pointer"
            >
              ESC · RESUME
            </button>
          </div>
        </div>

        {/* Tree Grid Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Hybrid Mastery Row */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-purple-900/40 pb-1">
              <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold">
                Singularity Hybrids (Time + Gravity Fusion)
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Requires mastery of both origins</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hybridNodes.map(renderNodeCard)}
            </div>
          </div>

          {/* Chrono & Vector Split Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chrono Column */}
            <div className="space-y-3">
              <div className="border-b border-cyan-900/40 pb-1">
                <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  The Chrono Origin (Temporal Distortion)
                </h3>
              </div>
              <div className="space-y-3">
                {chronoNodes.map(renderNodeCard)}
              </div>
            </div>

            {/* Vector Column */}
            <div className="space-y-3">
              <div className="border-b border-violet-900/40 pb-1">
                <h3 className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold">
                  The Vector Origin (Gravity Alteration)
                </h3>
              </div>
              <div className="space-y-3">
                {vectorNodes.map(renderNodeCard)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>The tree mutates autonomously during active combat as System Instability rises.</span>
          <span>Press TAB or ESC to return to Sector-07</span>
        </div>
      </div>
    </div>
  );
};
