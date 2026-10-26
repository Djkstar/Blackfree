/**
 * Blackfree: Anomaly Protocol - Cyberpunk Social Interaction & Trade Terminal
 * Enables deep interaction with living AI NPCs: real-time trust evaluation,
 * faction negotiations, item/catalyst trading, and companion squad recruitment.
 */

import React, { useState } from 'react';
import { AIUnit } from '../engine/ai.ts';
import { SocialInteractionEngine } from '../engine/social.ts';

interface SocialTradeModalProps {
  unit: AIUnit;
  social: SocialInteractionEngine;
  playerShards: number;
  onClose: () => void;
  onBuyItem: (itemId: string) => { success: boolean; message: string };
  onGiftShards: (amount: number) => { success: boolean; message: string };
  onRecruitEscort: () => { success: boolean; message: string };
}

export const SocialTradeModal: React.FC<SocialTradeModalProps> = ({
  unit,
  social,
  playerShards,
  onClose,
  onBuyItem,
  onGiftShards,
  onRecruitEscort,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const factionInfo = social.factions[unit.faction];
  const trust = social.getTrust(unit.id, 'player');
  const isEscort = unit.escortingPlayer === true;

  const handleBuy = (itemId: string) => {
    const res = onBuyItem(itemId);
    setFeedbackMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleGift = (amount: number) => {
    const res = onGiftShards(amount);
    setFeedbackMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleRecruit = () => {
    const res = onRecruitEscort();
    setFeedbackMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'epic': return 'text-purple-400 bg-purple-950/60 border-purple-500';
      case 'rare': return 'text-amber-400 bg-amber-950/60 border-amber-500';
      default: return 'text-cyan-400 bg-cyan-950/60 border-cyan-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-mono select-none">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
        {/* Terminal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rotate-45 border"
              style={{ backgroundColor: factionInfo.colorCss, borderColor: '#ffffff' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wider text-white uppercase">{unit.name}</h2>
                <span className="text-[10px] px-2 py-0.5 border text-slate-300 border-slate-700 bg-slate-800">
                  {unit.occupation.toUpperCase()}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 border"
                  style={{ color: factionInfo.colorCss, borderColor: factionInfo.colorCss, backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                  {factionInfo.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 italic">"{factionInfo.motto}"</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 border border-slate-700 hover:border-slate-500 text-xs bg-slate-900 cursor-pointer"
          >
            ✕ ESC
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-bold border-b ${
              feedbackMsg.isError ? 'bg-rose-950/80 border-rose-500 text-rose-300' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5">
          {/* 1. Trust & Relationship Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/40 border border-slate-800 p-4">
            {/* Trust Meter */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Neural Trust Score</span>
                <span className="text-white font-bold tabular-nums">
                  {trust >= 0 ? `+${trust}` : trust} / 100
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    trust > 30 ? 'bg-emerald-500' : trust >= 0 ? 'bg-cyan-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (trust + 100) / 2))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400">
                {trust >= 50
                  ? 'Devoted ally. Will defend you and follow as combat squadmate.'
                  : trust >= 20
                  ? 'Cooperative runner. Willing to trade items and coordinate.'
                  : trust >= 0
                  ? 'Cautious neutral. Standard black-market transactions only.'
                  : 'Distrustful. Hostile tendencies detected.'}
              </span>
            </div>

            {/* Companion / Pet Info */}
            <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active Companion</span>
              <span className="text-xs font-bold text-cyan-400">
                {unit.pet ? (unit.pet.type === 'recon_drone' ? '⚡ Recon Drone Mk-III' : '🐺 Cyber Hound V-4') : 'No Pet Equipped'}
              </span>
              <span className="text-[11px] text-slate-400">
                HP: <strong className="text-white">{unit.health}</strong> / {unit.maxHealth}
              </span>
            </div>
          </div>

          {/* 2. Item Trading Catalog */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Runner Inventory & Data Cache ({unit.inventory.length} items available)
              </h3>
              <span className="text-xs text-amber-400 font-bold tabular-nums">
                Your Shards: {playerShards}
              </span>
            </div>

            {unit.inventory.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 text-xs text-slate-500">
                Inventory depleted. Runner has no items left to trade in Sector-07.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unit.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border ${getRarityBadge(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{item.effectDescription}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold text-amber-400 tabular-nums">
                        {item.valueShards} {item.valueShards === 1 ? 'Shard' : 'Shards'}
                      </span>
                      <button
                        onClick={() => handleBuy(item.id)}
                        disabled={playerShards < item.valueShards}
                        className={`text-xs px-3 py-1 font-bold border transition-colors cursor-pointer ${
                          playerShards >= item.valueShards
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        PURCHASE ITEM
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Social Diplomacy & Recruitment Actions */}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Diplomatic Interactions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleGift(1)}
                disabled={playerShards < 1}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-xs text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="font-bold text-cyan-400">+ GIFT 1 SHARD</div>
                <div className="text-[10px] text-slate-400 mt-0.5">+12 Trust · +8 Faction Rep</div>
              </button>

              <button
                onClick={() => handleGift(3)}
                disabled={playerShards < 3}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 text-xs text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="font-bold text-amber-400">+ GIFT 3 SHARDS</div>
                <div className="text-[10px] text-slate-400 mt-0.5">+36 Trust · +24 Faction Rep</div>
              </button>

              <button
                onClick={handleRecruit}
                disabled={isEscort}
                className={`p-2.5 border text-xs text-left transition-colors cursor-pointer ${
                  isEscort
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-emerald-500 text-emerald-400'
                }`}
              >
                <div className="font-bold">
                  {isEscort ? '✓ ESCORT ACTIVE' : '⚡ RECRUIT AS ESCORT'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEscort ? 'Following in combat' : 'Requires Trust ≥ 30'}
                </div>
              </button>
            </div>
          </div>

          {/* 4. Player Global Faction Standing */}
          <div className="bg-slate-900/30 border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
              Sector-07 Player Faction Standing
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(Object.keys(social.factions) as Array<keyof typeof social.factions>).map((fKey) => {
                const fac = social.factions[fKey];
                const rep = social.playerReputation[fKey];
                return (
                  <div key={fKey} className="flex flex-col bg-slate-950/80 border border-slate-800 p-2">
                    <span className="text-[10px] font-bold truncate" style={{ color: fac.colorCss }}>
                      {fac.name}
                    </span>
                    <span className="text-xs font-bold text-white tabular-nums mt-0.5">
                      {rep >= 0 ? `+${rep}` : rep} Rep
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-600 transition-colors cursor-pointer"
          >
            DISCONNECT TERMINAL [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
