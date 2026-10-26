/**
 * Blackfree: Anomaly Protocol - Anomaly Gacha Terminal Modal (Blackfree 2.0)
 * High-thrill RNG rolling terminal, animated card reveals, tier visual effects,
 * and immediate reactive hotbar equipment.
 */

import React, { useState } from 'react';
import { AbilityItem, AbilityTier } from '../types.ts';
import { GachaManager, GachaRollResult } from '../engine/gacha.ts';

interface GachaModalProps {
  isOpen: boolean;
  onClose: () => void;
  gacha: GachaManager;
  evolutionShards: number;
  onRollSingle: () => GachaRollResult[] | null;
  onRollMulti: () => GachaRollResult[] | null;
  onEquipAbility: (slotIndex: number, abilityId: string) => void;
}

export const GachaModal: React.FC<GachaModalProps> = ({
  isOpen,
  onClose,
  gacha,
  evolutionShards,
  onRollSingle,
  onRollMulti,
  onEquipAbility,
}) => {
  const [recentRolls, setRecentRolls] = useState<GachaRollResult[]>([]);
  const [selectedAbility, setSelectedAbility] = useState<AbilityItem | null>(null);
  const [localSlots, setLocalSlots] = useState<(AbilityItem | null)[]>([...gacha.hotbarSlots]);

  if (!isOpen) return null;

  const unlockedList = Array.from(gacha.unlockedAbilities.values());

  const handleSingle = () => {
    const res = onRollSingle();
    if (res && res.length > 0) {
      setRecentRolls(res);
      setSelectedAbility(res[0].item);
      setLocalSlots([...gacha.hotbarSlots]);
    }
  };

  const handleMulti = () => {
    const res = onRollMulti();
    if (res && res.length > 0) {
      setRecentRolls(res);
      setSelectedAbility(res[0].item);
      setLocalSlots([...gacha.hotbarSlots]);
    }
  };

  const handleSlotAssign = (slotIdx: number, abilityId: string) => {
    onEquipAbility(slotIdx, abilityId);
    setLocalSlots([...gacha.hotbarSlots]);
  };

  const getTierBadge = (tier: AbilityTier) => {
    switch (tier) {
      case 'anomalous': return 'bg-rose-950/80 text-rose-300 border-rose-500 font-black animate-pulse';
      case 'legendary': return 'bg-amber-950/80 text-amber-300 border-amber-400 font-extrabold';
      case 'epic': return 'bg-purple-950/80 text-purple-300 border-purple-400 font-bold';
      case 'rare': return 'bg-cyan-950/80 text-cyan-300 border-cyan-400 font-semibold';
      default: return 'bg-slate-900 text-slate-300 border-slate-700 font-medium';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 text-white select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Quantum RNG System</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs font-mono text-amber-400">Pillar 1 Ability Acquisition</span>
            </div>
            <h2 className="text-xl font-mono font-bold text-white mt-0.5">
              THE ANOMALY GACHA TERMINAL
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 font-mono text-xs">
              <span className="text-slate-400">SHARDS: </span>
              <strong className="text-cyan-400 tabular-nums text-sm font-bold">{evolutionShards}</strong>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono px-3.5 py-1.5 border border-slate-600 cursor-pointer"
            >
              ESC · CLOSE
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Roll Actions Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-lg font-mono font-bold text-white mb-1">
                Channel Anomaly Shards
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Extract rare combat techniques and physics-bending powers from quantum spacetime tears.
                Duplicates automatically refund shards into your reserve.
              </p>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-slate-500">
                <span>Common: 45%</span>
                <span>·</span>
                <span>Rare: 32%</span>
                <span>·</span>
                <span>Epic: 15%</span>
                <span>·</span>
                <span className="text-amber-400 font-bold">Legendary: 6%</span>
                <span>·</span>
                <span className="text-rose-400 font-black">Anomalous: 2%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSingle}
                disabled={evolutionShards < 1}
                className={`px-5 py-3 border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  evolutionShards >= 1
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                Roll 1x (1 Shard)
              </button>

              <button
                onClick={handleMulti}
                disabled={evolutionShards < 4}
                className={`px-6 py-3 border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  evolutionShards >= 4
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                Multi 5x (4 Shards · 20% OFF)
              </button>
            </div>
          </div>

          {/* Recent Roll Cards */}
          {recentRolls.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Extracted Quantum Results
                </span>
                <span className="text-[11px] font-mono text-slate-500">Click any card to inspect & equip</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {recentRolls.map((res, i) => (
                  <div
                    key={`res_${i}`}
                    onClick={() => setSelectedAbility(res.item)}
                    className={`p-3 border cursor-pointer transition-all ${
                      selectedAbility?.id === res.item.id
                        ? 'border-cyan-400 bg-cyan-950/40 scale-105'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 border ${getTierBadge(res.item.tier)}`}>
                        {res.item.tier}
                      </span>
                      {res.isDuplicate ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold">+1 Refund</span>
                      ) : (
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">NEW!</span>
                      )}
                    </div>
                    <h4 className="text-xs font-mono font-bold text-white mb-1 truncate">{res.item.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{res.item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Hotbar Loadout (Slots Q, E, Z, X) */}
          <div className="bg-slate-950/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Combat Hotbar Loadout (Keys Q, E, Z, X)
              </span>
              <span className="text-[11px] font-mono text-slate-500">Currently equipped active powers</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Q', 'E', 'Z', 'X'].map((keyLabel, idx) => {
                const assigned = localSlots[idx];
                return (
                  <div key={keyLabel} className="bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">SLOT [{keyLabel}]</span>
                      {assigned && (
                        <span className={`text-[9px] uppercase px-1 border ${getTierBadge(assigned.tier)}`}>
                          {assigned.tier}
                        </span>
                      )}
                    </div>
                    {assigned ? (
                      <div>
                        <div className="text-xs font-mono font-bold text-white truncate">{assigned.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{assigned.cooldown}s Cooldown</div>
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-slate-600 italic py-2">Empty Slot</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Ability Detail & Equip Actions */}
          {selectedAbility && (
            <div className="bg-slate-950/95 border border-cyan-500 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-950/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase px-2 py-0.5 border ${getTierBadge(selectedAbility.tier)}`}>
                    {selectedAbility.tier}
                  </span>
                  <h4 className="text-sm font-mono font-bold text-white">{selectedAbility.name}</h4>
                  <span className="text-xs font-mono text-slate-400">· {selectedAbility.cooldown}s Cooldown</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">{selectedAbility.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-slate-400">Assign to:</span>
                {['Q', 'E', 'Z', 'X'].map((keyLabel, idx) => (
                  <button
                    key={keyLabel}
                    onClick={() => handleSlotAssign(idx, selectedAbility.id)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white border border-slate-600 font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    [{keyLabel}]
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Ability Collection */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                Unlocked Neural Archive ({unlockedList.length} Collected)
              </span>
              <span className="text-[11px] font-mono text-slate-500">Select any ability to equip it to your hotbar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unlockedList.map((item) => {
                const isEquipped = localSlots.some((s) => s?.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAbility(item)}
                    className={`p-3 border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedAbility?.id === item.id
                        ? 'border-cyan-400 bg-cyan-950/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 border ${getTierBadge(item.tier)}`}>
                          {item.tier}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isEquipped && (
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">✓ EQUIPPED</span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">{item.cooldown}s</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-mono font-bold text-white truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[9px] text-slate-500">Equip:</span>
                      {['Q', 'E', 'Z', 'X'].map((k, sIdx) => (
                        <button
                          key={k}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSlotAssign(sIdx, item.id);
                          }}
                          className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 border border-slate-700 transition-colors"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Collect Shards by neutralizing hostiles, surviving tears, or claiming rooftop loot crates.</span>
          <span>Press G or ESC to return to Sector-07</span>
        </div>
      </div>
    </div>
  );
};
