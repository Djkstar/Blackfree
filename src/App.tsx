/**
 * Blackfree: Anomaly Protocol - Application Root (Blackfree 2.0 Audited)
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameStats, OriginType, MutationAlert, SkillNode, CityEvent } from './types.ts';
import { GameEngine } from './engine/game.ts';
import { AIUnit } from './engine/ai.ts';
import { sound } from './engine/audio.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HUD } from './components/HUD.tsx';
import { GachaModal } from './components/GachaModal.tsx';
import { SkillTreeModal } from './components/SkillTreeModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { PauseModal } from './components/PauseModal.tsx';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState<boolean>(false);
  const [isGachaOpen, setIsGachaOpen] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<'elimination' | 'system_wipe'>('elimination');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  const [stats, setStats] = useState<GameStats>({
    kills: 0,
    stylePoints: 0,
    styleRank: 'FRESH',
    currentMultiplier: 1.0,
    instability: 0,
    aiGeneration: 1,
    evolutionShards: 5,
    timeSurvived: 0,
    mutationsTriggered: 0,
    activeOrigin: 'chrono',
    unlockedAbilitiesCount: 3,
  });

  const [playerVitals, setPlayerVitals] = useState({
    health: 100,
    maxHealth: 100,
    shield: 100,
    maxShield: 100,
    yaw: 0,
    pos: { x: 0, y: 22, z: 0 },
  });

  const [weaponInfo, setWeaponInfo] = useState({
    currentWeaponId: 'katana' as any,
    ammo: 0,
    isReloading: false,
  });

  const [aiUnits, setAiUnits] = useState<AIUnit[]>([]);
  const [cityEvents, setCityEvents] = useState<CityEvent[]>([]);
  const [mutationAlert, setMutationAlert] = useState<MutationAlert | null>(null);
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('blackfree_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });

  const handleStartGame = (origin: OriginType) => {
    if (!mountRef.current) return;

    if (!engineRef.current) {
      const engine = new GameEngine(mountRef.current, origin);
      engineRef.current = engine;

      engine.onStateUpdate = (newStats, player, weapons, _gacha, units, locked) => {
        setStats({ ...newStats });
        setPlayerVitals({
          health: player.health,
          maxHealth: player.maxHealth,
          shield: player.shield,
          maxShield: player.maxShield,
          yaw: player.yaw,
          pos: { x: player.position.x, y: player.position.y, z: player.position.z },
        });
        setWeaponInfo({
          currentWeaponId: weapons.currentWeaponId,
          ammo: weapons.ammo[weapons.currentWeaponId],
          isReloading: weapons.isReloading,
        });
        setAiUnits([...units]);
        setCityEvents([...engine.cityEvents]);
        setIsPointerLocked(locked);
      };

      engine.skills.onMutationCallback = (alert) => {
        setMutationAlert(alert);
        setSkillNodes(Array.from(engine.skills.nodes.values()));
        setTimeout(() => setMutationAlert(null), 5000);
      };

      engine.onGameOver = (finalStats, reason) => {
        setGameOverReason(reason);
        setGameState('gameover');
        if (finalStats.stylePoints > highScore) {
          setHighScore(finalStats.stylePoints);
          try {
            localStorage.setItem('blackfree_highscore', finalStats.stylePoints.toString());
          } catch {}
        }
      };

      setSkillNodes(Array.from(engine.skills.nodes.values()));
      engine.start();
    } else {
      engineRef.current.restart(origin);
      setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
    }

    setGameState('playing');
    setIsPaused(false);
    setIsSkillTreeOpen(false);
    setIsGachaOpen(false);
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart(stats.activeOrigin);
      setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
      setGameState('playing');
      setIsPaused(false);
      setIsSkillTreeOpen(false);
      setIsGachaOpen(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.code === 'KeyG') {
        e.preventDefault();
        setIsGachaOpen((prev) => {
          const next = !prev;
          if (engineRef.current) engineRef.current.setPaused(next);
          return next;
        });
      } else if (e.code === 'Tab' || e.code === 'KeyK') {
        e.preventDefault();
        setIsSkillTreeOpen((prev) => {
          const next = !prev;
          if (engineRef.current) {
            engineRef.current.setPaused(next);
            if (next) setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
          }
          return next;
        });
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (isGachaOpen) {
          setIsGachaOpen(false);
          engineRef.current?.setPaused(false);
        } else if (isSkillTreeOpen) {
          setIsSkillTreeOpen(false);
          engineRef.current?.setPaused(false);
        } else {
          setIsPaused((prev) => {
            const next = !prev;
            engineRef.current?.setPaused(next);
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [gameState, isGachaOpen, isSkillTreeOpen]);

  // Gacha Actions
  const handleRollSingle = () => {
    if (!engineRef.current) return null;
    const res = engineRef.current.gacha.rollSingle(stats.evolutionShards);
    if (res.success) {
      setStats((prev) => ({
        ...prev,
        evolutionShards: res.remainingShards,
        unlockedAbilitiesCount: engineRef.current!.gacha.unlockedAbilities.size,
      }));
      engineRef.current.skills.evolutionShards = res.remainingShards;
      return res.results;
    }
    return null;
  };

  const handleRollMulti = () => {
    if (!engineRef.current) return null;
    const res = engineRef.current.gacha.rollMulti(stats.evolutionShards);
    if (res.success) {
      setStats((prev) => ({
        ...prev,
        evolutionShards: res.remainingShards,
        unlockedAbilitiesCount: engineRef.current!.gacha.unlockedAbilities.size,
      }));
      engineRef.current.skills.evolutionShards = res.remainingShards;
      return res.results;
    }
    return null;
  };

  const handleEquipAbility = (slotIndex: number, abilityId: string) => {
    if (engineRef.current) {
      engineRef.current.gacha.equipToSlot(slotIndex, abilityId);
    }
  };

  const handleUnlockSkillNode = (nodeId: string) => {
    if (engineRef.current) {
      const ok = engineRef.current.skills.unlockNode(nodeId);
      if (ok) {
        setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
        setStats((prev) => ({ ...prev, evolutionShards: engineRef.current!.skills.evolutionShards }));
      }
    }
  };

  const handleForceMutation = () => {
    if (engineRef.current) {
      engineRef.current.skills.triggerRandomAutonomousMutation();
      setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleLockPointer = () => {
    if (engineRef.current) {
      engineRef.current.input.requestPointerLock();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-crosshair active:cursor-grabbing"
      />

      {gameState === 'title' && (
        <TitleScreen onStartGame={handleStartGame} highScore={highScore} />
      )}

      {gameState === 'playing' && engineRef.current && (
        <HUD
          stats={stats}
          health={playerVitals.health}
          maxHealth={playerVitals.maxHealth}
          shield={playerVitals.shield}
          maxShield={playerVitals.maxShield}
          currentWeaponId={weaponInfo.currentWeaponId}
          ammo={weaponInfo.ammo}
          isReloading={weaponInfo.isReloading}
          gacha={engineRef.current.gacha}
          aiUnits={aiUnits}
          playerYaw={playerVitals.yaw}
          playerPos={playerVitals.pos}
          cityEvents={cityEvents}
          mutationAlert={mutationAlert}
          isPointerLocked={isPointerLocked}
          onLockPointer={handleLockPointer}
          onOpenGacha={() => {
            setIsGachaOpen(true);
            engineRef.current?.setPaused(true);
          }}
          onOpenSkillTree={() => {
            setIsSkillTreeOpen(true);
            engineRef.current?.setPaused(true);
            if (engineRef.current) {
              setSkillNodes(Array.from(engineRef.current.skills.nodes.values()));
            }
          }}
          onTogglePause={() => {
            setIsPaused(true);
            engineRef.current?.setPaused(true);
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {engineRef.current && (
        <GachaModal
          isOpen={isGachaOpen}
          onClose={() => {
            setIsGachaOpen(false);
            engineRef.current?.setPaused(false);
          }}
          gacha={engineRef.current.gacha}
          evolutionShards={stats.evolutionShards}
          onRollSingle={handleRollSingle}
          onRollMulti={handleRollMulti}
          onEquipAbility={handleEquipAbility}
        />
      )}

      <SkillTreeModal
        isOpen={isSkillTreeOpen && !isGachaOpen}
        onClose={() => {
          setIsSkillTreeOpen(false);
          engineRef.current?.setPaused(false);
        }}
        nodes={skillNodes}
        evolutionShards={stats.evolutionShards}
        onUnlockNode={handleUnlockSkillNode}
        onForceMutation={handleForceMutation}
      />

      <PauseModal
        isOpen={isPaused && !isSkillTreeOpen && !isGachaOpen}
        onResume={() => {
          setIsPaused(false);
          engineRef.current?.setPaused(false);
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {gameState === 'gameover' && (
        <GameOverModal
          stats={stats}
          reason={gameOverReason}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
