/**
 * Blackfree: Anomaly Protocol - Anomaly Gacha System
 * Randomized tiered ability rolling engine powered by Evolution Shards.
 */

import { AbilityItem, AbilityTier, OriginType } from '../types.ts';
import { ALL_ABILITIES } from './abilities.ts';
import { sound } from './audio.ts';

export interface GachaRollResult {
  item: AbilityItem;
  isNew: boolean;
  isDuplicate: boolean;
  refundedShards: number;
}

export class GachaManager {
  public unlockedAbilities: Map<string, AbilityItem> = new Map();
  public hotbarSlots: (AbilityItem | null)[] = [null, null, null, null]; // 4 slots: Q, E, Z, X
  public cooldownTimers: number[] = [0, 0, 0, 0];

  constructor(startingOrigin: OriginType = 'chrono') {
    this.reset(startingOrigin);
  }

  public reset(origin: OriginType): void {
    this.unlockedAbilities.clear();

    // Default starter abilities based on Origin
    const starter1 = ALL_ABILITIES.find((a) => a.id === (origin === 'chrono' ? 'chrono_dilation' : 'vector_vortex'))!;
    const starter2 = ALL_ABILITIES.find((a) => a.id === 'nanite_infusion')!;
    const starter3 = ALL_ABILITIES.find((a) => a.id === (origin === 'chrono' ? 'phase_blink' : 'kinetic_rail_slam'))!;

    this.unlockedAbilities.set(starter1.id, { ...starter1 });
    this.unlockedAbilities.set(starter2.id, { ...starter2 });
    this.unlockedAbilities.set(starter3.id, { ...starter3 });

    this.hotbarSlots = [starter1, starter2, starter3, null];
    this.cooldownTimers = [0, 0, 0, 0];
  }

  public equipToSlot(slotIndex: number, abilityId: string): boolean {
    if (slotIndex < 0 || slotIndex >= 4) return false;
    const ability = this.unlockedAbilities.get(abilityId);
    if (!ability) return false;

    // Remove from other slot if already equipped
    for (let i = 0; i < 4; i++) {
      if (this.hotbarSlots[i]?.id === abilityId) {
        this.hotbarSlots[i] = null;
      }
    }

    this.hotbarSlots[slotIndex] = ability;
    this.cooldownTimers[slotIndex] = 0;
    return true;
  }

  public rollSingle(availableShards: number): { results: GachaRollResult[]; remainingShards: number; success: boolean } {
    if (availableShards < 1) {
      return { results: [], remainingShards: availableShards, success: false };
    }

    const picked = this.drawRandomAbility();
    let isNew = !this.unlockedAbilities.has(picked.id);
    let refunded = 0;

    if (isNew) {
      this.unlockedAbilities.set(picked.id, { ...picked });
      // If empty hotbar slot exists, auto-equip
      const emptyIdx = this.hotbarSlots.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        this.hotbarSlots[emptyIdx] = picked;
      }
    } else {
      // Duplicate reward: 1 shard refund or mutation chance
      refunded = 1;
    }

    sound.playMutationChime();

    return {
      results: [{ item: picked, isNew, isDuplicate: !isNew, refundedShards: refunded }],
      remainingShards: availableShards - 1 + refunded,
      success: true,
    };
  }

  public rollMulti(availableShards: number): { results: GachaRollResult[]; remainingShards: number; success: boolean } {
    if (availableShards < 4) {
      return { results: [], remainingShards: availableShards, success: false };
    }

    const results: GachaRollResult[] = [];
    let totalRefunded = 0;

    for (let i = 0; i < 5; i++) {
      const picked = this.drawRandomAbility();
      const isNew = !this.unlockedAbilities.has(picked.id);
      let refunded = 0;

      if (isNew) {
        this.unlockedAbilities.set(picked.id, { ...picked });
        const emptyIdx = this.hotbarSlots.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          this.hotbarSlots[emptyIdx] = picked;
        }
      } else {
        refunded = 1;
        totalRefunded += 1;
      }

      results.push({ item: picked, isNew, isDuplicate: !isNew, refundedShards: refunded });
    }

    sound.playMutationChime();

    // Cap total refund at 1 shard per multi-roll to preserve economy
    const cappedRefund = Math.min(totalRefunded, 1);
    return {
      results,
      remainingShards: availableShards - 4 + cappedRefund,
      success: true,
    };
  }

  private drawRandomAbility(): AbilityItem {
    const roll = Math.random() * 100;
    let targetTier: AbilityTier = 'common';

    if (roll < 2.5) targetTier = 'anomalous';
    else if (roll < 9) targetTier = 'legendary';
    else if (roll < 26) targetTier = 'epic';
    else if (roll < 58) targetTier = 'rare';
    else targetTier = 'common';

    const pool = ALL_ABILITIES.filter((a) => a.tier === targetTier);
    if (pool.length === 0) return ALL_ABILITIES[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  public update(dt: number): void {
    for (let i = 0; i < 4; i++) {
      if (this.cooldownTimers[i] > 0) {
        this.cooldownTimers[i] = Math.max(0, this.cooldownTimers[i] - dt);
      }
    }
  }

  public triggerSlot(slotIndex: number): AbilityItem | null {
    if (slotIndex < 0 || slotIndex >= 4) return null;
    const ability = this.hotbarSlots[slotIndex];
    if (!ability || this.cooldownTimers[slotIndex] > 0) return null;

    this.cooldownTimers[slotIndex] = ability.cooldown;
    return ability;
  }
}
