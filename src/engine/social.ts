/**
 * Blackfree: Anomaly Protocol - Social Interaction & Faction Module
 * Implements autonomous Trust Scores, dynamic Factions, and agent Item Trading.
 */

export type FactionId = 'syndicate' | 'wardens' | 'glitch_collective' | 'drifters';

export interface FactionInfo {
  id: FactionId;
  name: string;
  motto: string;
  colorHex: number;
  colorCss: string;
  influence: number; // Normalized percentage: 0 to 100, sum equals 100
  allies: FactionId[];
  enemies: FactionId[];
}

export interface SkirmishLocation {
  name: string;
  position: [number, number, number];
  radius: number;
}

export interface FactionSkirmish {
  id: string;
  name: string;
  locationName: string;
  position: [number, number, number];
  radius: number;
  factionA: FactionId;
  factionB: FactionId;
  scoreA: number;
  scoreB: number;
  targetScore: number;
  timeRemaining: number;
  maxTime: number;
  bountyShards: number;
  playerContributionA: number;
  playerContributionB: number;
  status: 'active' | 'resolved';
  winner?: FactionId;
  resolvedTimer: number;
}

export interface SkirmishResolutionEvent {
  skirmish: FactionSkirmish;
  winner: FactionId;
  loser: FactionId;
  influenceGain: number;
  playerRewarded: boolean;
  bountyShards: number;
  message: string;
}

export interface TradeItem {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  valueShards: number;
  effectDescription: string;
}

export const TRADE_CATALOG: TradeItem[] = [
  { id: 'nanite_core', name: 'Nanite Repair Core', rarity: 'common', valueShards: 1, effectDescription: '+40 Shield on use' },
  { id: 'overclock_chip', name: 'Neural Overclock Chip', rarity: 'rare', valueShards: 2, effectDescription: '-15% Ability Cooldowns' },
  { id: 'grav_capacitor', name: 'Grav-Flux Capacitor', rarity: 'rare', valueShards: 2, effectDescription: '+25% Wall-Run Speed' },
  { id: 'cyber_stim', name: 'Chronal Reflex Stim', rarity: 'epic', valueShards: 3, effectDescription: '+1.5s Dilation Duration' },
  { id: 'anomaly_catalyst', name: 'Anomaly Catalyst', rarity: 'epic', valueShards: 3, effectDescription: 'Guarantees rare Gacha pull' },
];

export const SKIRMISH_HOTSPOTS: SkirmishLocation[] = [
  { name: 'North Chrono Spire Plaza', position: [0, 20, -50], radius: 26 },
  { name: 'South Vector Core Hub', position: [0, 20, 50], radius: 26 },
  { name: 'East Tech Block Terraces', position: [48, 20, 0], radius: 24 },
  { name: 'West Comms Fortress', position: [-48, 20, 0], radius: 24 },
  { name: 'Sector-07 Central Atrium', position: [0, 20, 0], radius: 28 },
  { name: 'Skyline Skybridge Nexus', position: [28, 20, 28], radius: 22 },
  { name: 'Glitch Junction Sub-Roof', position: [-28, 20, -28], radius: 22 },
];

export class SocialInteractionEngine {
  public factions: Record<FactionId, FactionInfo> = {
    syndicate: {
      id: 'syndicate',
      name: 'Neon Syndicate',
      motto: 'Profit in the fray, sovereignty through speed.',
      colorHex: 0xf59e0b, // Amber
      colorCss: '#f59e0b',
      influence: 30,
      allies: ['drifters'],
      enemies: ['wardens'],
    },
    wardens: {
      id: 'wardens',
      name: 'Axiom Wardens',
      motto: 'Order preserves the timeline against the tear.',
      colorHex: 0x3b82f6, // Blue
      colorCss: '#3b82f6',
      influence: 35,
      allies: [],
      enemies: ['syndicate', 'glitch_collective'],
    },
    glitch_collective: {
      id: 'glitch_collective',
      name: 'Glitch Collective',
      motto: 'Embrace the anomaly; code is meant to evolve.',
      colorHex: 0xec4899, // Pink
      colorCss: '#ec4899',
      influence: 20,
      allies: [],
      enemies: ['wardens'],
    },
    drifters: {
      id: 'drifters',
      name: 'Skyline Drifters',
      motto: 'Unaffiliated runners navigating the rooftops.',
      colorHex: 0x10b981, // Emerald
      colorCss: '#10b981',
      influence: 15,
      allies: ['syndicate'],
      enemies: [],
    },
  };

  // Trust matrix: agentId -> (otherAgentId/playerId -> score between -100 and +100)
  public trustMatrix: Map<string, Map<string, number>> = new Map();

  // Active skirmishes
  public activeSkirmishes: FactionSkirmish[] = [];
  public skirmishSpawnCooldown: number = 6.0; // Spawns initial skirmish quickly
  public pendingResolutions: SkirmishResolutionEvent[] = [];

  // Player reputation per faction (-100 to +100)
  public playerReputation: Record<FactionId, number> = {
    syndicate: 15,
    wardens: 20,
    glitch_collective: 10,
    drifters: 25,
  };

  // Active in-world trades (for 3D beam rendering)
  public activeTrades: {
    id: string;
    giverId: string;
    receiverId: string;
    giverPos: [number, number, number];
    receiverPos: [number, number, number];
    item: TradeItem;
    life: number;
  }[] = [];

  constructor() {}

  public getTrust(agentA: string, agentB: string): number {
    if (!this.trustMatrix.has(agentA)) {
      this.trustMatrix.set(agentA, new Map());
    }
    const map = this.trustMatrix.get(agentA)!;
    if (!map.has(agentB)) {
      // Default initial trust between 20 and 50
      map.set(agentB, 30);
    }
    return map.get(agentB)!;
  }

  public modifyTrust(agentA: string, agentB: string, delta: number): number {
    const current = this.getTrust(agentA, agentB);
    const updated = Math.max(-100, Math.min(100, current + delta));
    this.trustMatrix.get(agentA)!.set(agentB, updated);
    return updated;
  }

  public modifyPlayerReputation(faction: FactionId, delta: number): void {
    this.playerReputation[faction] = Math.max(-100, Math.min(100, this.playerReputation[faction] + delta));
  }

  /**
   * Execute autonomous trade between two agents
   */
  public attemptTrade(
    agentA: { id: string; name: string; faction: FactionId; pos: [number, number, number]; inventory: TradeItem[]; shards: number },
    agentB: { id: string; name: string; faction: FactionId; pos: [number, number, number]; inventory: TradeItem[]; shards: number }
  ): { success: boolean; logText: string; item?: TradeItem } {
    const trust = this.getTrust(agentA.id, agentB.id);
    if (trust < 20) {
      return { success: false, logText: `${agentA.name} distrusts ${agentB.name}; trade rejected.` };
    }

    if (agentA.inventory.length === 0 && agentB.inventory.length === 0) {
      return { success: false, logText: 'No tradeable items available.' };
    }

    // Agent A sells an item to Agent B
    if (agentA.inventory.length > 0 && agentB.shards >= agentA.inventory[0].valueShards) {
      const item = agentA.inventory.shift()!;
      agentB.inventory.push(item);
      agentB.shards -= item.valueShards;
      agentA.shards += item.valueShards;

      this.modifyTrust(agentA.id, agentB.id, 15);
      this.modifyTrust(agentB.id, agentA.id, 15);

      this.activeTrades.push({
        id: `trade_${Date.now()}_${Math.random()}`,
        giverId: agentA.id,
        receiverId: agentB.id,
        giverPos: agentA.pos,
        receiverPos: agentB.pos,
        item,
        life: 2.0,
      });

      return {
        success: true,
        logText: `${agentA.name} [${this.factions[agentA.faction].name}] traded ${item.name} to ${agentB.name} for ${item.valueShards} Shards.`,
        item,
      };
    }

    return { success: false, logText: 'Trade negotiation stalled.' };
  }

  public generateStartingInventory(): TradeItem[] {
    const count = 1 + Math.floor(Math.random() * 2);
    const items: TradeItem[] = [];
    for (let i = 0; i < count; i++) {
      const randomItem = TRADE_CATALOG[Math.floor(Math.random() * TRADE_CATALOG.length)];
      items.push({ ...randomItem });
    }
    return items;
  }

  public getFactionForOccupation(occupation: string): FactionId {
    switch (occupation) {
      case 'syndicate_merc': return 'syndicate';
      case 'enforcer': return 'wardens';
      case 'netrunner': return 'glitch_collective';
      case 'courier': return 'drifters';
      case 'anomaly_hunter': return Math.random() < 0.5 ? 'wardens' : 'glitch_collective';
      default: return 'drifters';
    }
  }

  /**
   * Player purchases an item directly from an NPC
   */
  public playerPurchaseItem(
    agent: { id: string; name: string; faction: FactionId; inventory: TradeItem[]; shards: number },
    itemId: string,
    playerShards: number
  ): { success: boolean; item?: TradeItem; message: string; remainingShards: number } {
    const itemIndex = agent.inventory.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Item no longer available in inventory.', remainingShards: playerShards };
    }
    const item = agent.inventory[itemIndex];
    if (playerShards < item.valueShards) {
      return { success: false, message: `Insufficient Evolution Shards (Requires ${item.valueShards}).`, remainingShards: playerShards };
    }

    agent.inventory.splice(itemIndex, 1);
    agent.shards += item.valueShards;
    const remaining = playerShards - item.valueShards;

    this.modifyTrust(agent.id, 'player', 18);
    this.modifyPlayerReputation(agent.faction, 12);

    return {
      success: true,
      item,
      message: `Purchased ${item.name} from ${agent.name} for ${item.valueShards} Shards!`,
      remainingShards: remaining,
    };
  }

  /**
   * Player gifts shards to build trust and faction reputation
   */
  public playerGiftShards(
    agent: { id: string; name: string; faction: FactionId; shards: number },
    amount: number,
    playerShards: number
  ): { success: boolean; message: string; remainingShards: number } {
    if (playerShards < amount) {
      return { success: false, message: 'Not enough shards to gift.', remainingShards: playerShards };
    }
    agent.shards += amount;
    const remaining = playerShards - amount;
    const newTrust = this.modifyTrust(agent.id, 'player', amount * 12);
    this.modifyPlayerReputation(agent.faction, amount * 8);

    return {
      success: true,
      message: `Gifted ${amount} Shards to ${agent.name}. Trust increased to ${newTrust}!`,
      remainingShards: remaining,
    };
  }

  /**
   * Normalizes faction influence so the sum always equals 100%
   */
  public normalizeInfluence(): void {
    const factionIds: FactionId[] = ['syndicate', 'wardens', 'glitch_collective', 'drifters'];
    let total = 0;
    for (const f of factionIds) {
      this.factions[f].influence = Math.max(5, this.factions[f].influence);
      total += this.factions[f].influence;
    }
    if (total <= 0) return;
    let distributed = 0;
    for (let i = 0; i < factionIds.length - 1; i++) {
      const f = factionIds[i];
      const norm = Math.round((this.factions[f].influence / total) * 100);
      this.factions[f].influence = norm;
      distributed += norm;
    }
    // Give remainder to the last faction to ensure exact 100%
    const last = factionIds[factionIds.length - 1];
    this.factions[last].influence = Math.max(5, 100 - distributed);
  }

  /**
   * Shifts global influence between winning and losing factions
   */
  public shiftInfluence(winner: FactionId, loser: FactionId, delta: number): void {
    const shift = Math.max(3, Math.min(15, delta));
    this.factions[winner].influence += shift;
    this.factions[loser].influence -= shift;
    this.normalizeInfluence();
  }

  /**
   * Procedurally generates a new skirmish event across Sector-07
   */
  public spawnSkirmish(): FactionSkirmish | null {
    if (this.activeSkirmishes.filter((s) => s.status === 'active').length >= 2) {
      return null;
    }

    // Pick random hotspot
    const hotspot = SKIRMISH_HOTSPOTS[Math.floor(Math.random() * SKIRMISH_HOTSPOTS.length)];

    // Faction matchups
    const matchups: [FactionId, FactionId][] = [
      ['wardens', 'syndicate'],
      ['wardens', 'glitch_collective'],
      ['syndicate', 'drifters'],
      ['glitch_collective', 'syndicate'],
    ];
    const match = matchups[Math.floor(Math.random() * matchups.length)];
    const factionA = match[0];
    const factionB = match[1];

    const skirmishId = `skirmish_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newSkirmish: FactionSkirmish = {
      id: skirmishId,
      name: `Operation ${this.factions[factionA].name.split(' ')[0]} Clash`,
      locationName: hotspot.name,
      position: [...hotspot.position] as [number, number, number],
      radius: hotspot.radius,
      factionA,
      factionB,
      scoreA: 0,
      scoreB: 0,
      targetScore: 100,
      timeRemaining: 80,
      maxTime: 80,
      bountyShards: 4,
      playerContributionA: 0,
      playerContributionB: 0,
      status: 'active',
      resolvedTimer: 0,
    };

    this.activeSkirmishes.push(newSkirmish);
    return newSkirmish;
  }

  /**
   * Records combat within or near skirmish zones and awards tug-of-war points
   */
  public recordSkirmishCombat(
    attackerFaction: FactionId,
    defenderFaction: FactionId,
    damage: number,
    isPlayer: boolean,
    wasKilled: boolean,
    pos: [number, number, number]
  ): void {
    for (const sk of this.activeSkirmishes) {
      if (sk.status !== 'active') continue;

      const dx = pos[0] - sk.position[0];
      const dy = pos[1] - sk.position[1];
      const dz = pos[2] - sk.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Check if combat is within skirmish area (with generous 38m margin)
      if (dist <= sk.radius + 14) {
        const points = (wasKilled ? 25 : Math.round(damage * 0.45)) + (isPlayer ? 10 : 0);

        if (attackerFaction === sk.factionA || defenderFaction === sk.factionB) {
          sk.scoreA = Math.min(sk.targetScore, sk.scoreA + points);
          if (isPlayer) sk.playerContributionA += points;
        } else if (attackerFaction === sk.factionB || defenderFaction === sk.factionA) {
          sk.scoreB = Math.min(sk.targetScore, sk.scoreB + points);
          if (isPlayer) sk.playerContributionB += points;
        }

        // Check victory condition
        if (sk.scoreA >= sk.targetScore) {
          this.resolveSkirmish(sk, sk.factionA);
        } else if (sk.scoreB >= sk.targetScore) {
          this.resolveSkirmish(sk, sk.factionB);
        }
      }
    }
  }

  /**
   * Resolves a skirmish, adjusts global influence, and creates player bounty rewards
   */
  public resolveSkirmish(skirmish: FactionSkirmish, predeterminedWinner?: FactionId): SkirmishResolutionEvent {
    skirmish.status = 'resolved';
    const winner: FactionId = predeterminedWinner || (skirmish.scoreA >= skirmish.scoreB ? skirmish.factionA : skirmish.factionB);
    const loser: FactionId = winner === skirmish.factionA ? skirmish.factionB : skirmish.factionA;
    skirmish.winner = winner;

    const influenceGain = 10;
    this.shiftInfluence(winner, loser, influenceGain);

    const playerSupportedWinner = (winner === skirmish.factionA && skirmish.playerContributionA >= 25) ||
      (winner === skirmish.factionB && skirmish.playerContributionB >= 25);

    if (playerSupportedWinner) {
      this.modifyPlayerReputation(winner, 25);
      this.modifyPlayerReputation(loser, -15);
    }

    const event: SkirmishResolutionEvent = {
      skirmish,
      winner,
      loser,
      influenceGain,
      playerRewarded: playerSupportedWinner,
      bountyShards: playerSupportedWinner ? skirmish.bountyShards : 0,
      message: `${this.factions[winner].name} seized control of ${skirmish.locationName} (+${influenceGain}% Influence)!${
        playerSupportedWinner ? ` Bounty Claimed: +${skirmish.bountyShards} Shards!` : ''
      }`,
    };

    this.pendingResolutions.push(event);
    return event;
  }

  public update(dt: number): void {
    // 1. Tick active trade visual beams
    for (let i = this.activeTrades.length - 1; i >= 0; i--) {
      const tr = this.activeTrades[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.activeTrades.splice(i, 1);
      }
    }

    // 2. Skirmish Director spawn countdown
    this.skirmishSpawnCooldown -= dt;
    if (this.skirmishSpawnCooldown <= 0) {
      this.spawnSkirmish();
      this.skirmishSpawnCooldown = 40.0 + Math.random() * 20.0;
    }

    // 3. Tick active skirmishes
    for (let i = this.activeSkirmishes.length - 1; i >= 0; i--) {
      const sk = this.activeSkirmishes[i];
      if (sk.status === 'active') {
        sk.timeRemaining -= dt;

        // Slow ambient autonomous skirmish friction between opposing forces
        if (Math.random() < 0.18 * dt) {
          if (Math.random() < 0.5) sk.scoreA = Math.min(sk.targetScore, sk.scoreA + 2);
          else sk.scoreB = Math.min(sk.targetScore, sk.scoreB + 2);
        }

        if (sk.timeRemaining <= 0) {
          this.resolveSkirmish(sk);
        }
      } else {
        sk.resolvedTimer += dt;
        // Remove after 6 seconds of victory display
        if (sk.resolvedTimer > 6.0) {
          this.activeSkirmishes.splice(i, 1);
        }
      }
    }
  }
}


