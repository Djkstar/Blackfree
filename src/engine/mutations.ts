/**
 * Blackfree: Anomaly Protocol - Sentient Skill Tree & Autonomous Mutation Engine
 * Implements Pillar 1: Origin choice, active point spending, and passive sentient mutations.
 */

import { OriginType, SkillNode, MutationAlert } from '../types.ts';
import { sound } from './audio.ts';

export const INITIAL_SKILL_NODES: SkillNode[] = [
  // --- CHRONO ORIGIN BRANCH ---
  {
    id: 'chrono_dial_1',
    name: 'Tachyon Dilation',
    origin: 'chrono',
    description: 'Slow down local spacetime by 50% for 3 seconds. Out-run enemy projectiles.',
    cost: 1,
    unlocked: true,
    tier: 1,
    prerequisites: [],
    statsBonus: { timeDilation: 0.5 },
  },
  {
    id: 'chrono_step_2',
    name: 'Micro-Step Phase',
    origin: 'chrono',
    description: 'Dashing through enemy bullet trails renders you invulnerable and restores shield.',
    cost: 2,
    unlocked: false,
    tier: 2,
    prerequisites: ['chrono_dial_1'],
    statsBonus: { speed: 1.2 },
  },
  {
    id: 'chrono_rewind_3',
    name: 'Chronal Afterimage',
    origin: 'chrono',
    description: 'Slashing with Katana leaves temporal echoes that strike a second later.',
    cost: 3,
    unlocked: false,
    tier: 3,
    prerequisites: ['chrono_step_2'],
    statsBonus: { damage: 1.25 },
  },

  // --- VECTOR ORIGIN BRANCH ---
  {
    id: 'vector_well_1',
    name: 'Graviton Vortex',
    origin: 'vector',
    description: 'Deploy a high-density gravity well that pulls in nearby enemies and projectile trails.',
    cost: 1,
    unlocked: true,
    tier: 1,
    prerequisites: [],
    statsBonus: { gravityControl: 1.0 },
  },
  {
    id: 'vector_wallrun_2',
    name: 'Tensor Wall-Drive',
    origin: 'vector',
    description: 'Lock your gravity vector perpendicular to vertical walls, doubling wall-run speed.',
    cost: 2,
    unlocked: false,
    tier: 2,
    prerequisites: ['vector_well_1'],
    statsBonus: { speed: 1.35, jump: 1.2 },
  },
  {
    id: 'vector_slam_3',
    name: 'Singularity Impact',
    origin: 'vector',
    description: 'Crouch sliding off rooftops pulls down a kinetic meteor slam that shatters armor.',
    cost: 3,
    unlocked: false,
    tier: 3,
    prerequisites: ['vector_wallrun_2'],
    statsBonus: { damage: 1.3 },
  },

  // --- HYBRID ORIGIN BRANCH ---
  {
    id: 'hybrid_event_horizon',
    name: 'Event Horizon Well',
    origin: 'hybrid',
    description: 'Gravity wells now completely freeze time for any enemies and bullets trapped inside.',
    cost: 4,
    unlocked: false,
    tier: 4,
    prerequisites: ['chrono_step_2', 'vector_wallrun_2'],
    statsBonus: { timeDilation: 0.8, gravityControl: 1.5, damage: 1.4 },
  },
  {
    id: 'hybrid_quantum_rip',
    name: 'Dimensional Reflex',
    origin: 'hybrid',
    description: 'Parrying an enemy projectile immediately triggers a gravity shockwave and resets Dash.',
    cost: 4,
    unlocked: false,
    tier: 4,
    prerequisites: ['chrono_rewind_3', 'vector_slam_3'],
    statsBonus: { damage: 1.5, speed: 1.25 },
  },
];

const AUTONOMOUS_MUTATIONS: Record<string, { name: string; desc: string; stats: SkillNode['statsBonus'] }[]> = {
  chrono_dial_1: [
    {
      name: 'Strobe Paradox',
      desc: 'MUTATED: Time slow pulses violently every 0.5s, staggering nearby enemies with chronal shock.',
      stats: { damage: 1.2 },
    },
    {
      name: 'Relativistic Velocity',
      desc: 'MUTATED: Sprint and slide speed are tripled during temporal dilation.',
      stats: { speed: 1.6 },
    },
  ],
  vector_well_1: [
    {
      name: 'Repulsor Cascade',
      desc: 'MUTATED: Gravity well implodes after duration, blasting enemies outward into walls.',
      stats: { damage: 1.35 },
    },
    {
      name: 'Solid Light Web',
      desc: 'MUTATED: Sucked bullet trails solidify into temporary physical barricades and launch ramps.',
      stats: { instabilityResist: 0.3 },
    },
  ],
  chrono_step_2: [
    {
      name: 'Entangled Dash',
      desc: 'MUTATED: Dashing splits your hitbox into twin temporal phantoms that confuse AI targeting.',
      stats: { speed: 1.3 },
    },
  ],
  vector_wallrun_2: [
    {
      name: 'Ceiling Vector',
      desc: 'MUTATED: Wall-kicking allows running upside down along skyscraper underhangs.',
      stats: { jump: 1.4 },
    },
  ],
};

export class SkillTreeManager {
  public nodes: Map<string, SkillNode> = new Map();
  public evolutionShards: number = 2;
  public onMutationCallback?: (alert: MutationAlert) => void;
  private mutationTimer: number = 0;
  private mutationInterval: number = 30; // Attempt mutation every 30-45s of active gameplay

  constructor(startingOrigin: OriginType = 'chrono') {
    this.reset(startingOrigin);
  }

  public reset(startingOrigin: OriginType): void {
    this.nodes.clear();
    INITIAL_SKILL_NODES.forEach((node) => {
      // Starting node for chosen origin starts unlocked
      const isOriginStarter =
        (startingOrigin === 'chrono' && node.id === 'chrono_dial_1') ||
        (startingOrigin === 'vector' && node.id === 'vector_well_1');

      this.nodes.set(node.id, {
        ...node,
        unlocked: isOriginStarter,
        mutated: false,
        mutationDescription: undefined,
      });
    });
    this.evolutionShards = 2;
    this.mutationTimer = 18; // First mutation comes fairly early for demonstration
  }

  public unlockNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.unlocked) return false;

    // Check prerequisites
    const prereqsMet = node.prerequisites.every((reqId) => {
      const reqNode = this.nodes.get(reqId);
      return reqNode && reqNode.unlocked;
    });

    if (!prereqsMet && node.prerequisites.length > 0) return false;
    if (this.evolutionShards < node.cost) return false;

    this.evolutionShards -= node.cost;
    node.unlocked = true;
    sound.playMutationChime();
    return true;
  }

  public addShards(amount: number): void {
    this.evolutionShards += amount;
  }

  /**
   * Passive Sentience: Autonomous Mutation Cycle.
   * Triggered in game loop when combat heats up or instability rises.
   */
  public update(dt: number, instability: number): void {
    this.mutationTimer -= dt * (1 + instability / 100);

    if (this.mutationTimer <= 0) {
      this.triggerRandomAutonomousMutation();
      this.mutationInterval = Math.max(20, 45 - instability * 0.25);
      this.mutationTimer = this.mutationInterval;
    }
  }

  public triggerRandomAutonomousMutation(): void {
    // Pick an unlocked node that can mutate
    const eligibleNodes = Array.from(this.nodes.values()).filter(
      (n) => n.unlocked && AUTONOMOUS_MUTATIONS[n.id] && !n.mutated
    );

    if (eligibleNodes.length === 0) return;

    const targetNode = eligibleNodes[Math.floor(Math.random() * eligibleNodes.length)];
    const options = AUTONOMOUS_MUTATIONS[targetNode.id];
    const picked = options[Math.floor(Math.random() * options.length)];

    targetNode.mutated = true;
    targetNode.mutationDescription = picked.desc;
    if (picked.stats) {
      targetNode.statsBonus = { ...targetNode.statsBonus, ...picked.stats };
    }

    sound.playMutationChime();

    const alert: MutationAlert = {
      id: `mut_${Date.now()}`,
      nodeName: targetNode.name,
      effect: picked.desc,
      timestamp: Date.now(),
      origin: targetNode.origin,
    };

    if (this.onMutationCallback) {
      this.onMutationCallback(alert);
    }
  }

  public getComputedStats(): Required<NonNullable<SkillNode['statsBonus']>> {
    const stats: Required<NonNullable<SkillNode['statsBonus']>> = {
      speed: 1.0,
      jump: 1.0,
      damage: 1.0,
      timeDilation: 1.0,
      gravityControl: 1.0,
      instabilityResist: 0.0,
    };

    this.nodes.forEach((node) => {
      if (node.unlocked && node.statsBonus) {
        if (node.statsBonus.speed) stats.speed *= node.statsBonus.speed;
        if (node.statsBonus.jump) stats.jump *= node.statsBonus.jump;
        if (node.statsBonus.damage) stats.damage *= node.statsBonus.damage;
        if (node.statsBonus.timeDilation) stats.timeDilation *= node.statsBonus.timeDilation;
        if (node.statsBonus.gravityControl) stats.gravityControl *= node.statsBonus.gravityControl;
        if (node.statsBonus.instabilityResist) stats.instabilityResist += node.statsBonus.instabilityResist;
      }
    });

    return stats;
  }
}
