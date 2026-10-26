/**
 * Blackfree: Anomaly Protocol - Broadcast-Grade World HUD (Blackfree 2.0 Audited)
 */

import React from 'react';
import { GameStats, MutationAlert, WeaponId, CityEvent } from '../types.ts';
import { WEAPON_REGISTRY } from '../engine/weapons.ts';
import { GachaManager } from '../engine/gacha.ts';
import { AIUnit } from '../engine/ai.ts';

interface HUDProps {
  stats: GameStats;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  currentWeaponId: WeaponId;
  ammo: number;
  isReloading: boolean;
  gacha: GachaManager;
  aiUnits: AIUnit[];
  playerYaw: number;
  playerPos?: { x: number; y: number; z: number };
  cityEvents: CityEvent[];
  mutationAlert: MutationAlert | null;
  isPointerLocked: boolean;
  onLockPointer: () => void;
  onOpenGacha: () => void;
  onOpenSkillTree: () => void;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  health,
  maxHealth,
  shield,
  maxShield,
  currentWeaponId,
  ammo,
  isReloading,
  gacha,
  aiUnits,
  playerYaw,
  playerPos,
  cityEvents,
  mutationAlert,
  isPointerLocked,
  onLockPointer,
  onOpenGacha,
  onOpenSkillTree,
  onTogglePause,
  isMuted,
  onToggleMute,
}) => {
  const activeDef = WEAPON_REGISTRY[currentWeaponId];
  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shield / maxShield) * 100));

  const deg = (((-playerYaw * 180) / Math.PI) % 360 + 360) % 360;
  const getCardinal = (d: number) => {
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'ULTRAKILL': return 'text-rose-500 font-black tracking-widest animate-pulse';
      case 'SUPREME': return 'text-amber-400 font-black tracking-wide';
      case 'ANOMALOUS': return 'text-purple-400 font-extrabold';
      case 'BRUTAL': return 'text-cyan-400 font-bold';
      case 'CARNAGE': return 'text-emerald-400 font-semibold';
      default: return 'text-slate-400 font-medium';
    }
  };

  const speakingCitizens = aiUnits.filter((u) => u.speechText !== null);

  // Proximity interaction calculation
  const nearestCitizen = playerPos
    ? aiUnits.find((u) => {
        const dx = u.position.x - playerPos.x;
        const dy = u.position.y - playerPos.y;
        const dz = u.position.z - playerPos.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) < 4.2;
      })
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-5 md:p-6 text-white font-mono">
      {/* 1. TOP HEADER CLUSTER */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Vitals & Style */}
        <div className="flex flex-col gap-2.5 min-w-[270px]">
          {/* Health & Shield */}
          <div className="bg-slate-950/85 border border-slate-800 p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="uppercase text-cyan-400 font-bold tracking-wider">{stats.activeOrigin} Origin</span>
              <span className="tabular-nums text-slate-400">GEN {stats.aiGeneration} AI</span>
            </div>

            {/* Health Bar */}
            <div className="mb-1.5">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-rose-400 font-semibold">VITALS</span>
                <span className="text-white tabular-nums">{Math.round(health)} / {maxHealth}</span>
              </div>
              <div className="w-full h-2 bg-slate-900 border border-slate-800">
                <div className="h-full bg-rose-500 transition-all duration-75" style={{ width: `${healthPercent}%` }} />
              </div>
            </div>

            {/* Shield Bar */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-cyan-400 font-semibold">SHIELD</span>
                <span className="text-white tabular-nums">{Math.round(shield)} / {maxShield}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 border border-slate-800">
                <div className="h-full bg-cyan-400 transition-all duration-75" style={{ width: `${shieldPercent}%` }} />
              </div>
            </div>
          </div>

          {/* ULTRAKILL Style Badge */}
          <div className="bg-slate-950/85 border border-slate-800 px-3 py-1.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Combat Rating</span>
              <span className={`text-sm ${getRankColor(stats.styleRank)}`}>{stats.styleRank}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white tabular-nums">+{stats.stylePoints}</span>
            </div>
          </div>
        </div>

        {/* Center: Live City Broadcast Ticker */}
        <div className="hidden lg:flex flex-col items-center max-w-lg w-full">
          {cityEvents.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 px-4 py-1.5 flex items-center gap-3 text-xs w-full justify-center shadow-lg">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">SECTOR FEED //</span>
              <span className="text-slate-200 truncate">{cityEvents[0].text}</span>
            </div>
          )}

          {/* Overhead Speech Bubbles */}
          {speakingCitizens.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 w-full max-w-md items-center animate-fade-in">
              {speakingCitizens.slice(0, 2).map((u) => (
                <div
                  key={u.id}
                  className={`text-[11px] px-3 py-1 border shadow-md ${
                    u.relationship === 'ally'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                      : u.relationship === 'rival'
                      ? 'bg-amber-950/80 border-amber-500/80 text-amber-200'
                      : 'bg-slate-950/80 border-cyan-500/80 text-cyan-200'
                  }`}
                >
                  <strong className="mr-1">[{u.name} · {u.faction.replace('_', ' ').toUpperCase()}]:</strong>
                  <span>{u.speechText}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Instability Gauge & Mini-Radar */}
        <div className="flex flex-col gap-2.5 min-w-[250px] items-end">
          <div className="bg-slate-950/85 border border-slate-800 p-3 w-full">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={stats.instability > 75 ? 'text-rose-500 font-bold animate-pulse' : 'text-amber-400 font-semibold'}>
                SYSTEM INSTABILITY
              </span>
              <span className="text-white tabular-nums font-bold">{stats.instability}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 border border-slate-800 overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-150 ${
                  stats.instability > 75 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${stats.instability}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-1">
              <span>KILLS: <strong className="text-white tabular-nums">{stats.kills}</strong></span>
              <span>SHARDS: <strong className="text-cyan-400 tabular-nums">{stats.evolutionShards}</strong></span>
            </div>
          </div>

          <div className="bg-slate-950/85 border border-slate-800 px-3 py-1.5 flex items-center justify-between w-full text-xs">
            <span className="text-slate-500 uppercase text-[10px]">Bearing</span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">{getCardinal(deg)}</span>
              <span className="text-white tabular-nums text-[11px]">{Math.round(deg)}°</span>
            </div>
            <span className="text-[10px] text-slate-400">{aiUnits.length} Runners</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER RETICLE */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white/80 rounded-full" />
        <div className="absolute -left-3.5 w-2 h-[1.5px] bg-white/60" />
        <div className="absolute -right-3.5 w-2 h-[1.5px] bg-white/60" />
        <div className="absolute -top-3.5 w-[1.5px] h-2 bg-white/60" />
        <div className="absolute -bottom-3.5 w-[1.5px] h-2 bg-white/60" />
      </div>

      {/* Center Toast for Mutation */}
      {mutationAlert && (
        <div className="self-center bg-slate-950/90 border border-purple-500 p-3 max-w-md animate-bounce shadow-xl shadow-purple-950/40">
          <div className="text-xs text-purple-400 font-bold mb-1">
            ⚡ SENTIENT TREE MUTATION // {mutationAlert.nodeName}
          </div>
          <p className="text-xs text-white leading-relaxed">{mutationAlert.effect}</p>
        </div>
      )}

      {/* 3. BOTTOM CONTROLS & LOADOUT CLUSTER */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom Left: 4-Slot Ability Hotbar (Q, E, Z, X) */}
        <div className="flex items-center gap-2">
          {['Q', 'E', 'Z', 'X'].map((keyLabel, idx) => {
            const ability = gacha.hotbarSlots[idx];
            const cd = gacha.cooldownTimers[idx];
            const isReady = cd <= 0;

            return (
              <div
                key={keyLabel}
                className={`bg-slate-950/90 border p-2 min-w-[76px] flex flex-col items-center transition-all ${
                  isReady ? 'border-cyan-500/80 shadow-sm shadow-cyan-950/30' : 'border-slate-800 opacity-75'
                }`}
              >
                <span className="text-[10px] font-bold text-cyan-400">[{keyLabel}]</span>
                <span className="text-[11px] font-bold text-white truncate max-w-[70px] mt-0.5">
                  {ability ? ability.name.split(' ')[0] : 'EMPTY'}
                </span>
                <span className="text-[10px] tabular-nums mt-0.5 text-slate-300">
                  {isReady ? 'READY' : `${cd.toFixed(1)}s`}
                </span>
              </div>
            );
          })}

          <div className="flex flex-col gap-1.5 ml-2">
            <button
              onClick={onOpenGacha}
              className="pointer-events-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 text-xs uppercase tracking-wider border border-amber-300 shadow-md transition-colors cursor-pointer"
            >
              G · GACHA ROLLS
            </button>
            <button
              onClick={onOpenSkillTree}
              className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1 text-xs transition-colors cursor-pointer"
            >
              TAB · SENTIENT TREE
            </button>
          </div>
        </div>

        {/* Bottom Center: Camera Aim Status & Interaction Helper */}
        <div className="flex flex-col items-center gap-1.5">
          {nearestCitizen && (
            <div className="bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs px-4 py-1.5 shadow-lg shadow-emerald-950/50 animate-bounce font-bold tracking-wider">
              ⚡ [F] TRADE & DIPLOMACY // {nearestCitizen.name.toUpperCase()} [{nearestCitizen.faction.toUpperCase()}]
            </div>
          )}
          <button
            onClick={onLockPointer}
            className={`pointer-events-auto text-[11px] font-mono px-3.5 py-1 border transition-colors cursor-pointer ${
              isPointerLocked
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-cyan-950/80 border-cyan-400 text-cyan-300 hover:bg-cyan-900 animate-pulse'
            }`}
          >
            {isPointerLocked ? '● MOUSE LOOK: LOCKED (ESC TO RELEASE)' : '⚡ CLICK TO LOCK MOUSE AIM (OR DRAG / ARROW KEYS)'}
          </button>
          <span className="text-[10px] text-slate-400 bg-slate-950/70 px-2 py-0.5 border border-slate-800">
            F to Talk · 1-4 Weapons · Space Jump · Shift Slide
          </span>
        </div>

        {/* Bottom Right: Weapon View & Ammo Counter */}
        <div className="bg-slate-950/85 border border-slate-800 p-3 min-w-[250px] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Equipped Weapon</span>
            <span className="text-sm font-bold text-white">{activeDef.name}</span>
            <span className="text-xs text-slate-400">
              {activeDef.type === 'melee'
                ? 'Blade Parry Ready (LMB)'
                : isReloading
                ? 'RELOADING...'
                : `AMMO: ${ammo} / ${activeDef.magSize}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(['katana', 'rifle', 'revolver', 'shotgun'] as WeaponId[]).map((wId, i) => (
              <span
                key={wId}
                className={`w-5 h-5 flex items-center justify-center text-[10px] border ${
                  currentWeaponId === wId
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40 font-bold'
                    : 'border-slate-800 text-slate-600'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
