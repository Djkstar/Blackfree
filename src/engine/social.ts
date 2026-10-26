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
  influence: number; // 0 to 100
  allies: FactionId[];
  enemies: FactionId[];
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

export class SocialInteractionEngine {
  public factions: Record<FactionId, FactionInfo> = {
    syndicate: {
      id: 'syndicate',
      name: 'Neon Syndicate',
      motto: 'Profit in the fray, sovereignty through speed.',
      colorHex: 0xf59e0b, // Amber
      colorCss: '#f59e0b',
      influence: 35,
      allies: ['drifters'],
      enemies: ['wardens'],
    },
    wardens: {
      id: 'wardens',
      name: 'Axiom Wardens',
      motto: 'Order preserves the timeline against the tear.',
      colorHex: 0x3b82f6, // Blue
      colorCss: '#3b82f6',
      influence: 40,
      allies: [],
      enemies: ['syndicate', 'glitch_collective'],
    },
    glitch_collective: {
      id: 'glitch_collective',
      name: 'Glitch Collective',
      motto: 'Embrace the anomaly; code is meant to evolve.',
      colorHex: 0xec4899, // Pink
      colorCss: '#ec4899',
      influence: 25,
      allies: [],
      enemies: ['wardens'],
    },
    drifters: {
      id: 'drifters',
      name: 'Skyline Drifters',
      motto: 'Unaffiliated runners navigating the rooftops.',
      colorHex: 0x10b981, // Emerald
      colorCss: '#10b981',
      influence: 20,
      allies: ['syndicate'],
      enemies: [],
    },
  };

  // Trust matrix: agentId -> (otherAgentId/playerId -> score between -100 and +100)
  public trustMatrix: Map<string, Map<string, number>> = new Map();

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

  public update(dt: number): void {
    // Tick active trade visual beams
    for (let i = this.activeTrades.length - 1; i >= 0; i--) {
      const tr = this.activeTrades[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.activeTrades.splice(i, 1);
      }
    }
  }
}

