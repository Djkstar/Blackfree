/**
 * Blackfree: Anomaly Protocol - Types & Interfaces (Blackfree 2.0)
 */

export type OriginType = 'chrono' | 'vector';

export type WeaponId = 'katana' | 'rifle' | 'revolver' | 'shotgun';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  type: 'melee' | 'hitscan' | 'projectile';
  damage: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  recoil: number;
  range: number;
  pellets?: number;
  spread?: number;
  accentColor: string;
}

export type StyleRank = 'FRESH' | 'CARNAGE' | 'BRUTAL' | 'ANOMALOUS' | 'SUPREME' | 'ULTRAKILL';

export type AbilityTier = 'common' | 'rare' | 'epic' | 'legendary' | 'anomalous';

export interface AbilityItem {
  id: string;
  name: string;
  tier: AbilityTier;
  origin: OriginType | 'universal' | 'hybrid';
  description: string;
  cooldown: number;
  iconName: string;
  accentColor: string;
  executeEffect: string; // Identifier for execution logic
  mutated?: boolean;
}

export interface SkillNode {
  id: string;
  name: string;
  origin: OriginType | 'hybrid';
  description: string;
  cost: number;
  unlocked: boolean;
  tier: number;
  mutated?: boolean;
  mutationDescription?: string;
  prerequisites: string[];
  statsBonus?: {
    speed?: number;
    jump?: number;
    damage?: number;
    timeDilation?: number;
    gravityControl?: number;
    instabilityResist?: number;
  };
}

export interface MutationAlert {
  id: string;
  nodeName: string;
  effect: string;
  timestamp: number;
  origin: OriginType | 'hybrid';
}

export interface EnemyStats {
  generation: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackInterval: number;
  canWallRun: boolean;
  canBulletClimb: boolean;
  evasionChance: number;
}

export type FactionId = 'syndicate' | 'wardens' | 'glitch_collective' | 'drifters';

export interface TradeItem {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  valueShards: number;
  effectDescription: string;
}

export type NPCOccupation = 'netrunner' | 'courier' | 'enforcer' | 'syndicate_merc' | 'anomaly_hunter';
export type NPCRelationship = 'ally' | 'neutral' | 'rival' | 'nemesis';
export type CyberPetType = 'recon_drone' | 'cyber_hound';

export interface LootCrate {
  id: string;
  x: number;
  y: number;
  z: number;
  claimed: boolean;
  tier: AbilityTier;
  shards: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface CityEvent {
  id: string;
  text: string;
  type: 'loot' | 'combat' | 'social' | 'anomaly';
  timestamp: number;
}

export interface GameStats {
  kills: number;
  stylePoints: number;
  styleRank: StyleRank;
  currentMultiplier: number;
  instability: number;
  aiGeneration: number;
  evolutionShards: number;
  timeSurvived: number;
  mutationsTriggered: number;
  activeOrigin: OriginType;
  unlockedAbilitiesCount: number;
}
