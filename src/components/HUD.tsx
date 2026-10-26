/**
 * Blackfree: Anomaly Protocol — AAA Cyberpunk HUD
 */

import React, { useState, useEffect } from 'react';
import { GameStats, MutationAlert, WeaponId, CityEvent } from '../types.ts';
import { WEAPON_REGISTRY } from '../engine/weapons.ts';
import { GachaManager } from '../engine/gacha.ts';
import { AIUnit } from '../engine/ai.ts';
import { AbilityItem } from '../types.ts';

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

// ── Ability Slot ────────────────────────────────────────────────────────────
interface AbilitySlotProps {
  keyLabel: string;
  ability: AbilityItem | null;
  cooldown: number;
  index: number;
}

const SLOT_ACCENT = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];

const AbilitySlot: React.FC<AbilitySlotProps> = ({ keyLabel, ability, cooldown, index }) => {
  const isReady = cooldown <= 0;
  const accent = ability?.accentColor ?? SLOT_ACCENT[index];
  const cdPct = ability ? Math.max(0, cooldown / ability.cooldown) : 0;

  return (
    <div
      className="relative flex flex-col items-center justify-between overflow-hidden"
      style={{
        width: 72,
        height: 72,
        background: 'rgba(0,0,0,0.65)',
        border: `1px solid ${isReady ? accent : '#334155'}`,
        boxShadow: isReady ? `0 0 8px ${accent}55` : 'none',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* cooldown clock-wipe overlay */}
      {!isReady && cdPct > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `conic-gradient(rgba(0,0,0,0.72) ${cdPct * 360}deg, transparent ${cdPct * 360}deg)`,
          }}
        />
      )}

      {/* key badge */}
      <div
        className="w-full text-center font-mono text-[9px] font-bold pt-1"
        style={{ color: accent, letterSpacing: '0.12em' }}
      >
        [{keyLabel}]
      </div>

      {/* ability name */}
      <div className="w-full text-center px-1 font-mono text-[10px] font-bold text-white leading-tight">
        {ability ? ability.name.split(' ').slice(0, 2).join(' ') : <span className="text-slate-600">EMPTY</span>}
      </div>

      {/* cooldown readout */}
      <div
        className="w-full text-center font-mono text-[9px] pb-1"
        style={{ color: isReady ? '#4ade80' : '#94a3b8' }}
      >
        {isReady ? '● READY' : `${cooldown.toFixed(1)}s`}
      </div>
    </div>
  );
};

// ── Crosshair ───────────────────────────────────────────────────────────────
const getCrosshairJSX = (weaponId: WeaponId): React.ReactNode => {
  const baseStyle: React.CSSProperties = { position: 'absolute' };

  if (weaponId === 'katana') {
    return (
      <div style={{ ...baseStyle, width: 28, height: 28, border: '1.5px solid rgba(6,182,212,0.85)', borderRadius: '50%' }} />
    );
  }
  if (weaponId === 'revolver' || weaponId === 'railgun') {
    return (
      <>
        <div style={{ ...baseStyle, width: 4, height: 4, background: '#fff', borderRadius: '50%' }} />
        <div style={{ ...baseStyle, width: 12, height: 1.5, background: 'rgba(255,255,255,0.7)', left: -20 }} />
        <div style={{ ...baseStyle, width: 12, height: 1.5, background: 'rgba(255,255,255,0.7)', right: -20 }} />
        <div style={{ ...baseStyle, width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', top: -20 }} />
        <div style={{ ...baseStyle, width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', bottom: -20 }} />
      </>
    );
  }
  if (weaponId === 'shotgun') {
    const corners = [
      { top: -14, left: -14 }, { top: -14, right: -14 },
      { bottom: -14, left: -14 }, { bottom: -14, right: -14 },
    ];
    return (
      <>
        <div style={{ ...baseStyle, width: 3, height: 3, background: 'rgba(255,255,255,0.6)', borderRadius: '50%' }} />
        {corners.map((s, i) => (
          <div key={i} style={{ ...baseStyle, width: 6, height: 1.5, background: 'rgba(255,255,255,0.55)', transform: 'rotate(45deg)', ...s }} />
        ))}
      </>
    );
  }
  // rifle / smg / throwing_knives — standard cross
  return (
    <>
      <div style={{ ...baseStyle, width: 2, height: 2, background: '#fff', borderRadius: '50%' }} />
      <div style={{ ...baseStyle, width: 10, height: 1.5, background: 'rgba(255,255,255,0.75)', left: -18 }} />
      <div style={{ ...baseStyle, width: 10, height: 1.5, background: 'rgba(255,255,255,0.75)', right: -18 }} />
      <div style={{ ...baseStyle, width: 1.5, height: 10, background: 'rgba(255,255,255,0.75)', top: -18 }} />
      <div style={{ ...baseStyle, width: 1.5, height: 10, background: 'rgba(255,255,255,0.75)', bottom: -18 }} />
    </>
  );
};

// ── Main HUD ────────────────────────────────────────────────────────────────
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
  const [hitFlash, setHitFlash] = useState(false);
  const prevHealth = React.useRef(health);

  useEffect(() => {
    if (health < prevHealth.current) {
      setHitFlash(true);
      const t = setTimeout(() => setHitFlash(false), 160);
      prevHealth.current = health;
      return () => clearTimeout(t);
    }
    prevHealth.current = health;
  }, [health]);

  const activeDef = WEAPON_REGISTRY[currentWeaponId];
  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const shieldPct = Math.max(0, Math.min(100, (shield / maxShield) * 100));

  const deg = (((-playerYaw * 180) / Math.PI) % 360 + 360) % 360;
  const cardinal = (() => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg < 67.5) return 'NE';
    if (deg < 112.5) return 'E';
    if (deg < 157.5) return 'SE';
    if (deg < 202.5) return 'S';
    if (deg < 247.5) return 'SW';
    if (deg < 292.5) return 'W';
    return 'NW';
  })();

  const healthColor = healthPct > 60 ? '#22c55e' : healthPct > 30 ? '#f59e0b' : '#ef4444';
  const instabilityCritical = stats.instability > 75;

  // Nearest nemesis for threat indicator
  const nearestNemesis = playerPos
    ? aiUnits.find(u => {
        if (u.relationship !== 'nemesis') return false;
        const dx = u.position.x - playerPos.x;
        const dz = u.position.z - playerPos.z;
        return Math.sqrt(dx * dx + dz * dz) < 30;
      })
    : null;

  const nearestCitizen = playerPos
    ? aiUnits.find(u => {
        const dx = u.position.x - playerPos.x;
        const dy = u.position.y - playerPos.y;
        const dz = u.position.z - playerPos.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) < 4.2;
      })
    : null;

  const speakingCitizens = aiUnits.filter(u => u.speechText !== null);

  // Compass tick marks spanning ±60° around current bearing
  const compassTicks: React.ReactNode[] = [];
  for (let offset = -60; offset <= 60; offset += 10) {
    const tickDeg = (deg + offset + 360) % 360;
    const isCardinal = tickDeg % 90 === 0;
    const isSubCardinal = tickDeg % 45 === 0 && !isCardinal;
    const label = tickDeg === 0 ? 'N' : tickDeg === 90 ? 'E' : tickDeg === 180 ? 'S' : tickDeg === 270 ? 'W'
      : tickDeg === 45 ? 'NE' : tickDeg === 135 ? 'SE' : tickDeg === 225 ? 'SW' : tickDeg === 315 ? 'NW' : null;
    const x = ((offset + 60) / 120) * 100;
    compassTicks.push(
      <div
        key={offset}
        className="absolute flex flex-col items-center"
        style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
      >
        <div style={{ width: 1, height: isCardinal ? 12 : isSubCardinal ? 8 : 5, background: isCardinal ? '#06b6d4' : '#475569' }} />
        {label && (
          <span style={{ fontSize: 9, color: isCardinal ? '#06b6d4' : '#64748b', fontFamily: 'monospace', marginTop: 1, fontWeight: isCardinal ? 700 : 400 }}>
            {label}
          </span>
        )}
      </div>
    );
  }

  const panel = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(51,65,85,0.8)',
    ...extra,
  });

  const rankLabel = stats.styleRank;
  const rankClass =
    rankLabel === 'ULTRAKILL' ? 'rank-ultrakill' :
    rankLabel === 'SUPREME' ? 'rank-supreme' :
    rankLabel === 'ANOMALOUS' ? 'rank-anomalous' : '';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ fontFamily: 'monospace' }}>
      <style>{`
        @keyframes glitch {
          0%,100%{transform:skewX(0deg) skewY(0deg)}
          15%{transform:skewX(-3deg)}
          30%{transform:skewX(2deg) skewY(1deg)}
          60%{transform:skewX(-1deg)}
        }
        @keyframes instability-flicker {
          0%,100%{opacity:1} 25%{opacity:0.3} 60%{opacity:0.85} 80%{opacity:0.2}
        }
        @keyframes fade-in-up {
          from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes nemesis-pulse {
          0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5}
        }
        @keyframes hit-vignette {
          0%{box-shadow:inset 0 0 80px 30px rgba(239,68,68,0.6)}
          100%{box-shadow:inset 0 0 0 0 rgba(239,68,68,0)}
        }
        .rank-ultrakill { animation:glitch 0.35s infinite; text-shadow:0 0 18px #ef4444,0 0 36px #ef4444; color:#ef4444; }
        .rank-supreme   { text-shadow:0 0 14px #f59e0b; color:#f59e0b; }
        .rank-anomalous { text-shadow:0 0 12px #a78bfa; color:#a78bfa; }
        .instability-critical { animation:instability-flicker 0.28s infinite; }
        .mutation-popup { animation:fade-in-up 0.18s ease-out; }
        .nemesis-dot    { animation:nemesis-pulse 0.6s infinite; }
        .hit-vignette   { animation:hit-vignette 0.16s ease-out forwards; }
      `}</style>

      {/* ── Hit vignette flash ───────────────────────────────────────── */}
      {hitFlash && <div className="absolute inset-0 hit-vignette pointer-events-none" />}

      {/* ══════════════════════════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 gap-3">

        {/* ── Top-left: Style rank ─────────────────────────────────── */}
        <div style={{ ...panel({ padding: '8px 14px', minWidth: 180 }) }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Combat Rating</div>
          <div className={`text-lg font-black tracking-widest ${rankClass}`} style={{ color: rankClass ? undefined : '#475569' }}>
            {rankLabel}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{stats.stylePoints.toLocaleString()}</span>
            <span style={{ fontSize: 9, color: '#06b6d4', letterSpacing: '0.1em' }}>PTS</span>
          </div>
        </div>

        {/* ── Top-center: Compass + feed ───────────────────────────── */}
        <div className="flex flex-col items-center flex-1 max-w-sm">
          {/* Compass bar */}
          <div style={{ ...panel({ width: '100%', padding: '6px 0', position: 'relative', overflow: 'hidden', height: 36 }) }}>
            {compassTicks}
            {/* center tick */}
            <div style={{ position: 'absolute', left: '50%', top: 0, width: 1.5, height: '100%', background: '#06b6d4', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#06b6d4', fontWeight: 700 }}>
              {cardinal} {Math.round(deg)}°
            </div>
          </div>

          {/* NPC speech */}
          {speakingCitizens.length > 0 && (
            <div className="mt-1 w-full flex flex-col gap-0.5">
              {speakingCitizens.slice(0, 2).map(u => (
                <div key={u.id} style={{
                  ...panel({ padding: '4px 10px', fontSize: 10, borderColor: u.relationship === 'ally' ? '#10b981' : u.relationship === 'nemesis' ? '#ef4444' : '#06b6d4' }),
                  color: u.relationship === 'ally' ? '#6ee7b7' : u.relationship === 'nemesis' ? '#fca5a5' : '#7dd3fc',
                }}>
                  <strong>[{u.name}]:</strong> {u.speechText}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Top-right: Kill feed ─────────────────────────────────── */}
        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
          {cityEvents.slice(0, 3).map((ev, i) => (
            <div key={ev.id} style={{
              ...panel({ padding: '3px 10px', fontSize: 9, opacity: 1 - i * 0.28 }),
              color: ev.type === 'combat' ? '#fca5a5' : ev.type === 'anomaly' ? '#e879f9' : ev.type === 'loot' ? '#4ade80' : '#7dd3fc',
              letterSpacing: '0.05em',
            }}>
              {ev.text}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CENTER CROSSHAIR
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 1, height: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {getCrosshairJSX(currentWeaponId)}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MUTATION ALERT (center overlay)
      ══════════════════════════════════════════════════════════════ */}
      {mutationAlert && (
        <div className="mutation-popup" style={{
          position: 'absolute',
          top: '42%', left: '50%',
          transform: 'translate(-50%, -50%)',
          ...panel({ padding: '10px 20px', borderColor: '#a78bfa', boxShadow: '0 0 24px #7c3aed66' }),
          maxWidth: 380, textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            ⚡ SENTIENT MUTATION // {mutationAlert.nodeName}
          </div>
          <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.5 }}>{mutationAlert.effect}</div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM CLUSTER
      ══════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4 gap-3">

        {/* ── Bottom-left: Health/Shield + Ability bar ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Vitals */}
          <div style={{ ...panel({ padding: '10px 14px', minWidth: 220 }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {stats.activeOrigin} · GEN {stats.aiGeneration}
              </span>
              <span style={{ fontSize: 9, color: '#475569' }}>{aiUnits.length} units</span>
            </div>

            {/* Health */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: healthColor, fontWeight: 700, letterSpacing: '0.1em' }}>VITALS</span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(health)}<span style={{ fontSize: 9, color: '#475569' }}>/{maxHealth}</span></span>
              </div>
              <div style={{ width: '100%', height: 7, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${healthPct}%`,
                  background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
                  boxShadow: `0 0 6px ${healthColor}88`,
                  transition: 'width 0.06s',
                  borderRadius: 2,
                }} />
              </div>
            </div>

            {/* Shield */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#06b6d4', fontWeight: 700, letterSpacing: '0.1em' }}>SHIELD</span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(shield)}<span style={{ fontSize: 9, color: '#475569' }}>/{maxShield}</span></span>
              </div>
              <div style={{ width: '100%', height: 5, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${shieldPct}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
                  boxShadow: '0 0 6px #06b6d488',
                  transition: 'width 0.06s',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          </div>

          {/* Ability hotbar */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['Q', 'E', 'Z', 'X'] as const).map((k, i) => (
              <AbilitySlot key={k} keyLabel={k} ability={gacha.hotbarSlots[i]} cooldown={gacha.cooldownTimers[i]} index={i} />
            ))}
            <div className="pointer-events-auto flex flex-col gap-1 ml-1 justify-end">
              <button onClick={onOpenGacha}
                style={{ background: '#d97706', border: '1px solid #fbbf24', color: '#000', fontSize: 10, fontWeight: 900, padding: '5px 10px', letterSpacing: '0.1em', cursor: 'pointer' }}>
                [G] GACHA
              </button>
              <button onClick={onOpenSkillTree}
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid #334155', color: '#94a3b8', fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}>
                [TAB] SKILL TREE
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom-center: interaction / pointer lock ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {nearestCitizen && (
            <div style={{ ...panel({ padding: '5px 14px', borderColor: '#10b981', color: '#6ee7b7', fontSize: 10, fontWeight: 700, boxShadow: '0 0 12px #05966988' }) }}>
              ⚡ [F] TRADE // {nearestCitizen.name.toUpperCase()}
            </div>
          )}
          <button
            onClick={onLockPointer}
            className="pointer-events-auto"
            style={{
              ...panel({
                padding: '5px 14px',
                fontSize: 10,
                borderColor: isPointerLocked ? '#10b981' : '#06b6d4',
                color: isPointerLocked ? '#4ade80' : '#7dd3fc',
                cursor: 'pointer',
              }),
            }}
          >
            {isPointerLocked ? '● MOUSE LOCKED (ESC)' : '⚡ CLICK TO LOCK AIM'}
          </button>
          <div style={{ fontSize: 9, color: '#475569', ...panel({ padding: '3px 10px' }) }}>
            F Talk · 1-7 Weapons · Space Jump · Shift Slide · R Reload
          </div>
        </div>

        {/* ── Bottom-right: Weapon + ammo + instability ────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>

          {/* Instability */}
          <div style={{ ...panel({ padding: '8px 14px', minWidth: 220 }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className={instabilityCritical ? 'instability-critical' : ''} style={{ fontSize: 10, color: instabilityCritical ? '#ef4444' : '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {instabilityCritical ? '⚠ CRITICAL INSTABILITY' : 'System Instability'}
              </span>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{stats.instability}%</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div className={instabilityCritical ? 'instability-critical' : ''} style={{
                height: '100%',
                width: `${stats.instability}%`,
                background: instabilityCritical
                  ? 'linear-gradient(90deg, #ef4444, #f43f5e)'
                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                boxShadow: instabilityCritical ? '0 0 8px #ef444488' : '0 0 4px #f59e0b44',
                transition: 'width 0.1s',
                borderRadius: 2,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ color: '#64748b' }}>KILLS <strong style={{ color: '#fff' }}>{stats.kills}</strong></span>
              <span style={{ color: '#64748b' }}>SHARDS <strong style={{ color: '#06b6d4' }}>{stats.evolutionShards}</strong></span>
              <span style={{ color: '#64748b' }}>MUTATIONS <strong style={{ color: '#a78bfa' }}>{stats.mutationsTriggered}</strong></span>
            </div>
          </div>

          {/* Weapon panel */}
          <div style={{ ...panel({ padding: '8px 14px', minWidth: 220 }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Equipped</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: activeDef.accentColor }}>{activeDef.name}</div>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>{activeDef.type.toUpperCase()} · {activeDef.range}m</div>
              </div>
              {/* Digital ammo counter */}
              {activeDef.type !== 'melee' ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: isReloading ? 10 : 22, fontWeight: 900, color: isReloading ? '#f59e0b' : '#fff', letterSpacing: '0.05em', lineHeight: 1 }}>
                    {isReloading ? 'RELOAD' : String(ammo).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 9, color: '#475569' }}>/ {activeDef.magSize}</div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: '#06b6d4', fontWeight: 700 }}>BLADE</div>
              )}
            </div>

            {/* Weapon slot row */}
            <div style={{ display: 'flex', gap: 3 }}>
              {(['katana', 'rifle', 'revolver', 'shotgun', 'smg', 'railgun', 'throwing_knives'] as WeaponId[]).map((wId, i) => (
                <div key={wId} style={{
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700,
                  border: `1px solid ${currentWeaponId === wId ? WEAPON_REGISTRY[wId].accentColor : '#1e293b'}`,
                  color: currentWeaponId === wId ? WEAPON_REGISTRY[wId].accentColor : '#334155',
                  background: currentWeaponId === wId ? `${WEAPON_REGISTRY[wId].accentColor}18` : 'transparent',
                }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nemesis threat indicator ──────────────────────────────────── */}
      {nearestNemesis && playerPos && (
        <div style={{ position: 'absolute', top: '50%', right: 48, transform: 'translateY(-50%)' }}>
          <div className="nemesis-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 12px #ef4444' }} />
          <div style={{ fontSize: 8, color: '#ef4444', marginTop: 3, textAlign: 'center', fontWeight: 700 }}>
            {Math.round(Math.sqrt(
              Math.pow(nearestNemesis.position.x - playerPos.x, 2) +
              Math.pow(nearestNemesis.position.z - playerPos.z, 2)
            ))}m
          </div>
        </div>
      )}

      {/* ── Pointer lock overlay (full screen prompt) ────────────────── */}
      {!isPointerLocked && (
        <div
          className="pointer-events-auto"
          onClick={onLockPointer}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)', cursor: 'crosshair',
          }}
        >
          <div style={{ ...panel({ padding: '24px 40px', textAlign: 'center', borderColor: '#06b6d4' }) }}>
            <div style={{ fontSize: 13, color: '#06b6d4', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 8 }}>BLACKFREE // ANOMALY PROTOCOL</div>
            <div style={{ fontSize: 22, color: '#fff', fontWeight: 900, letterSpacing: '0.1em', marginBottom: 4 }}>CLICK TO ENGAGE</div>
            <div style={{ fontSize: 10, color: '#475569' }}>Locks mouse · WASD move · Space jump · Shift slide · 1-7 weapons</div>
          </div>
        </div>
      )}
    </div>
  );
};
