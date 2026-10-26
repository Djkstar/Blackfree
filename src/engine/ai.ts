/**
 * Blackfree: Anomaly Protocol - Living AI Civilization Subsystem (Blackfree 2.0)
 * Deep multi-agent simulation: NPCs fight each other, own active Cyber-Pets,
 * display overhead 3D health bars, contest loot crates, and converse with the player.
 */

import * as THREE from 'three';
import { NPCOccupation, NPCRelationship, CyberPetType, EnemyStats } from '../types.ts';
import { CityManager } from './city.ts';
import { ProjectileManager } from './projectiles.ts';
import { sound } from './audio.ts';
import { SocialInteractionEngine, FactionId, TradeItem } from './social.ts';

export interface CyberPet {
  type: CyberPetType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  attackCooldown: number;
}

export interface AIUnit {
  id: string;
  name: string;
  occupation: NPCOccupation;
  relationship: NPCRelationship;
  faction: FactionId;
  inventory: TradeItem[];
  shards: number;
  tradeCooldown: number;
  escortingPlayer?: boolean;
  mesh: THREE.Group;
  visorMesh: THREE.Mesh;
  healthBarMesh: THREE.Mesh;
  factionBadgeMesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  state: 'roam' | 'job_task' | 'chase' | 'attack_windup' | 'wall_run' | 'contest_loot' | 'escort';
  targetEnemy: AIUnit | 'player' | null;
  windupTimer: number;
  attackCooldown: number;
  wallRunTimer: number;
  jobTimer: number;
  isGrounded: boolean;
  canWallRun: boolean;
  eyeLight: THREE.PointLight;
  speechText: string | null;
  speechTimer: number;
  hitFlashTimer: number;
  accentColor: number;
  pet: CyberPet | null;
  learnedBehaviors: Set<'wall_run' | 'bullet_climb' | 'strafe_dodge' | 'flank'>;
  observationScore: number;
}

const NPC_NAMES = [
  'Kael_Zero', 'Vex_Netrunner', 'Axiom_9', 'Spectre_Runner', 'Echo_Valkyrie',
  'Cipher_Ghost', 'Nova_Drifter', 'Helix_Blade', 'Mirage_X', 'Rift_Courier'
];

const JOB_SPEECH: Record<NPCOccupation, string[]> = {
  netrunner: [
    'Siphoning encrypted data from Sector-07 mainframe...',
    'Firewall breached. Transferring shards.',
    'System Instability is leaking into the comms grid!',
  ],
  courier: [
    'Quantum cargo transit in progress. Wall-driving now!',
    'Express delivery across Sector-07 skyline!',
    'Clear the catwalk, runner coming through!',
  ],
  enforcer: [
    'Area quarantine in effect. Neutralizing hostile vectors.',
    'Maintain structural stability! Contain the tear!',
    'Hostile anomaly target acquired!',
  ],
  syndicate_merc: [
    'Bounty spotted on that Anomaly Hunter.',
    'Race you to that rooftop crate!',
    'Covering your flank, runner! Slicing through their line!',
  ],
  anomaly_hunter: [
    'Reality is collapsing. Stand ready!',
    'Spatial tear detected at 12 o\'clock!',
    'Unlocking Chrono singularity now!',
  ],
};

export const SKIRMISH_SPEECH: Record<FactionId, string[]> = {
  syndicate: [
    'Secure the payload! Sector-07 belongs to the Syndicate!',
    'Neon Syndicate never yields territory!',
    'Liquidate their assets! Drive them off the roof!',
  ],
  wardens: [
    'Axiom Protocols initiated: Neutralize unauthorized faction!',
    'Hold the perimeter! Timeline integrity depends on Axiom!',
    'Order will prevail over rogue anomaly networks!',
  ],
  glitch_collective: [
    'Overclocking anomaly harmonics! Data belongs to everyone!',
    'Execute sub-routine: Eradicate opposing firewall!',
    'The Collective expands! Code will not be bound!',
  ],
  drifters: [
    'Keep moving, Drifters! Clear the skyline!',
    'High-velocity breach! Rooftops belong to the free!',
    'Strike fast and slip the net!',
  ],
};

export class AIManager {
  public group: THREE.Group;
  public units: AIUnit[] = [];
  public currentGeneration: number = 1;
  public totalUnitsEvolved: number = 0;
  public recentChatLines: { sender: string; text: string; time: number; relationship: NPCRelationship }[] = [];

  public baseStats: Record<NPCOccupation, EnemyStats> = {
    netrunner: { generation: 1, maxHealth: 90, speed: 10.5, damage: 16, attackInterval: 1.4, canWallRun: true, canBulletClimb: false, evasionChance: 0.35 },
    courier: { generation: 1, maxHealth: 85, speed: 15.0, damage: 14, attackInterval: 1.1, canWallRun: true, canBulletClimb: true, evasionChance: 0.5 },
    enforcer: { generation: 1, maxHealth: 240, speed: 7.0, damage: 32, attackInterval: 1.8, canWallRun: false, canBulletClimb: false, evasionChance: 0.1 },
    syndicate_merc: { generation: 1, maxHealth: 140, speed: 11.5, damage: 24, attackInterval: 1.0, canWallRun: true, canBulletClimb: false, evasionChance: 0.25 },
    anomaly_hunter: { generation: 1, maxHealth: 380, speed: 13.5, damage: 45, attackInterval: 0.85, canWallRun: true, canBulletClimb: true, evasionChance: 0.45 },
  };

  public social: SocialInteractionEngine;

  constructor() {
    this.group = new THREE.Group();
    this.social = new SocialInteractionEngine();
  }

  public triggerGenerationalEvolution(): void {
    this.currentGeneration++;
    this.totalUnitsEvolved++;

    Object.keys(this.baseStats).forEach((k) => {
      const type = k as NPCOccupation;
      const stats = this.baseStats[type];
      stats.generation = this.currentGeneration;
      stats.speed = Math.min(18, stats.speed * 1.06);
      stats.maxHealth = Math.round(stats.maxHealth * 1.1);
      stats.damage = Math.round(stats.damage * 1.06);
      stats.evasionChance = Math.min(0.75, stats.evasionChance + 0.05);
      stats.canWallRun = true;
    });

    // Generation 2+: all units learn bullet_climb
    if (this.currentGeneration >= 2) {
      this.units.forEach(u => u.learnedBehaviors.add('bullet_climb'));
      (Object.keys(this.baseStats) as NPCOccupation[]).forEach(k => { this.baseStats[k].canBulletClimb = true; });
    }
    // Generation 3+: all units learn flank
    if (this.currentGeneration >= 3) {
      this.units.forEach(u => u.learnedBehaviors.add('flank'));
    }

    this.addChat('SYSTEM', `AI Network Generational Evolution ${this.currentGeneration} synchronized across Sector-07.`, 'neutral');
  }

  public observePlayerAction(actionType: 'wall_run' | 'parkour' | 'parry', playerPos: THREE.Vector3): void {
    this.units.forEach(u => {
      if (u.position.distanceTo(playerPos) < 25) {
        u.observationScore += 15;
        if (u.observationScore >= 100) {
          u.observationScore = 0;
          if (actionType === 'wall_run') u.learnedBehaviors.add('wall_run');
          else if (actionType === 'parry') u.learnedBehaviors.add('strafe_dodge');
          else u.learnedBehaviors.add('flank');
          this.triggerSpeech(u, `Adapting behavioral matrix: ${actionType} pattern acquired!`);
        }
      }
    });
  }

  public spawnCitizen(
    occupation: NPCOccupation,
    relationship: NPCRelationship,
    spawnPos: THREE.Vector3,
    customName?: string,
    customFaction?: FactionId
  ): AIUnit {
    const stats = this.baseStats[occupation];
    const unitGroup = new THREE.Group();
    const name = customName || NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
    const faction: FactionId = customFaction || this.social.getFactionForOccupation(occupation);
    const factionInfo = this.social.factions[faction];

    let primaryColor = 0x1e293b;
    let accentColor = factionInfo.colorHex;
    if (relationship === 'nemesis') accentColor = 0xef4444;

    if (occupation === 'netrunner') primaryColor = 0x0f172a;
    else if (occupation === 'enforcer') primaryColor = 0x1e1b4b;
    else if (occupation === 'anomaly_hunter') primaryColor = 0x090d16;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.75, 1.1, 0.45);
    const torsoMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.8, roughness: 0.25 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    unitGroup.add(torso);

    // Core
    const coreGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 1.2, 0.24);
    unitGroup.add(core);

    // Head
    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.95, 0);
    unitGroup.add(head);

    // Visor
    const visorGeo = new THREE.BoxGeometry(0.36, 0.1, 0.08);
    const visorMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.95, 0.22);
    unitGroup.add(visor);

    // Eye Light
    const eyeLight = new THREE.PointLight(accentColor, 0.6, 4);
    eyeLight.position.set(0, 1.95, 0.35);
    unitGroup.add(eyeLight);

    // Overhead 3D Health Bar (Billboard plane facing forward)
    const hpBarGeo = new THREE.PlaneGeometry(0.9, 0.1);
    const hpBarMat = new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide });
    const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat);
    hpBar.position.set(0, 2.45, 0);
    unitGroup.add(hpBar);

    // Overhead 3D Faction Sigil (Rotating Octahedron)
    const factionSigilGeo = new THREE.OctahedronGeometry(0.14);
    const factionSigilMat = new THREE.MeshBasicMaterial({ color: factionInfo.colorHex, wireframe: false });
    const factionSigil = new THREE.Mesh(factionSigilGeo, factionSigilMat);
    factionSigil.position.set(0, 2.7, 0);
    unitGroup.add(factionSigil);

    // Cyber-Pet
    let pet: CyberPet | null = null;
    if (Math.random() < 0.75 || occupation === 'anomaly_hunter' || occupation === 'enforcer') {
      const petType: CyberPetType = occupation === 'enforcer' ? 'cyber_hound' : 'recon_drone';
      pet = this.buildCyberPet(petType, accentColor);
      this.group.add(pet.mesh);
    }

    unitGroup.position.copy(spawnPos);
    this.group.add(unitGroup);

    const unit: AIUnit = {
      id: `npc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name,
      occupation,
      relationship,
      faction,
      inventory: this.social.generateStartingInventory(),
      shards: 2 + Math.floor(Math.random() * 3),
      tradeCooldown: 3.0 + Math.random() * 4.0,
      mesh: unitGroup,
      visorMesh: visor,
      healthBarMesh: hpBar,
      factionBadgeMesh: factionSigil,
      position: spawnPos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      state: 'roam',
      targetEnemy: null,
      windupTimer: 0,
      attackCooldown: 1.0,
      wallRunTimer: 0,
      jobTimer: 4.0 + Math.random() * 5.0,
      isGrounded: true,
      canWallRun: stats.canWallRun,
      eyeLight,
      speechText: null,
      speechTimer: 0,
      hitFlashTimer: 0,
      accentColor,
      pet,
      learnedBehaviors: new Set(),
      observationScore: 0,
    };

    this.units.push(unit);
    this.triggerSpeech(unit, `Online. Sector-07 [${factionInfo.name}] ${occupation.toUpperCase()} ready.`);
    return unit;
  }

  private buildCyberPet(type: CyberPetType, accentColor: number): CyberPet {
    const petGroup = new THREE.Group();

    if (type === 'recon_drone') {
      const bodyGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.1 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      petGroup.add(body);

      const ringGeo = new THREE.TorusGeometry(0.36, 0.03, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: accentColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      petGroup.add(ring);
    } else {
      const houndBodyGeo = new THREE.BoxGeometry(0.45, 0.35, 0.7);
      const houndBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });
      const body = new THREE.Mesh(houndBodyGeo, houndBodyMat);
      body.position.y = 0.35;
      petGroup.add(body);

      const houndHeadGeo = new THREE.BoxGeometry(0.25, 0.25, 0.3);
      const houndHeadMat = new THREE.MeshBasicMaterial({ color: accentColor });
      const head = new THREE.Mesh(houndHeadGeo, houndHeadMat);
      head.position.set(0, 0.5, 0.42);
      petGroup.add(head);
    }

    return {
      type,
      mesh: petGroup,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      attackCooldown: 2.0,
    };
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    city: CityManager,
    projectiles: ProjectileManager,
    timeDilationFactor: number = 1.0,
    camera?: THREE.Camera
  ): { hitsOnPlayer: number; damageDealt: number; shardDrops: number } {
    let hitsOnPlayer = 0;
    let damageDealt = 0;
    let shardDrops = 0;

    // Tick social trades & trust decay/beams
    this.social.update(dt);

    // 1. Autonomous Inter-NPC Trading Check
    for (let a = 0; a < this.units.length; a++) {
      const unitA = this.units[a];
      if (unitA.tradeCooldown > 0 || unitA.relationship === 'nemesis' || unitA.state === 'chase' || unitA.state === 'attack_windup') continue;

      for (let b = a + 1; b < this.units.length; b++) {
        const unitB = this.units[b];
        if (unitB.tradeCooldown > 0 || unitB.relationship === 'nemesis' || unitB.state === 'chase' || unitB.state === 'attack_windup') continue;

        if (unitA.position.distanceTo(unitB.position) < 4.5) {
          const tradeResult = this.social.attemptTrade(
            { id: unitA.id, name: unitA.name, faction: unitA.faction, pos: [unitA.position.x, unitA.position.y + 1, unitA.position.z], inventory: unitA.inventory, shards: unitA.shards },
            { id: unitB.id, name: unitB.name, faction: unitB.faction, pos: [unitB.position.x, unitB.position.y + 1, unitB.position.z], inventory: unitB.inventory, shards: unitB.shards }
          );

          if (tradeResult.success) {
            unitA.tradeCooldown = 14.0;
            unitB.tradeCooldown = 14.0;
            this.triggerSpeech(unitA, `Deal closed with ${unitB.name}. Data/item transfer complete.`);
            this.triggerSpeech(unitB, `Payment verified. Shards balanced.`);
            sound.playMutationChime();
            break;
          }
        }
      }
    }

    // 2. Dynamic Skirmish Reinforcements & Mobilization
    for (const sk of this.social.activeSkirmishes) {
      if (sk.status !== 'active') continue;
      if (this.units.length >= 13) continue;

      const unitsA = this.units.filter((u) => u.faction === sk.factionA);
      const unitsB = this.units.filter((u) => u.faction === sk.factionB);

      if (unitsA.length < 2) {
        const angle = Math.random() * Math.PI * 2;
        const spawnP = new THREE.Vector3(
          sk.position[0] + Math.cos(angle) * (sk.radius * 0.65),
          sk.position[1] + 2,
          sk.position[2] + Math.sin(angle) * (sk.radius * 0.65)
        );
        const occ: NPCOccupation = sk.factionA === 'wardens' ? 'enforcer' : sk.factionA === 'syndicate' ? 'syndicate_merc' : 'netrunner';
        const unit = this.spawnCitizen(occ, 'neutral', spawnP, undefined, sk.factionA);
        unit.state = 'chase';
        this.triggerSpeech(unit, `Mobilizing to defend ${sk.locationName}!`);
      }

      if (unitsB.length < 2) {
        const angle = Math.random() * Math.PI * 2;
        const spawnP = new THREE.Vector3(
          sk.position[0] + Math.cos(angle) * (sk.radius * 0.65),
          sk.position[1] + 2,
          sk.position[2] + Math.sin(angle) * (sk.radius * 0.65)
        );
        const occ: NPCOccupation = sk.factionB === 'wardens' ? 'enforcer' : sk.factionB === 'syndicate' ? 'syndicate_merc' : 'courier';
        const unit = this.spawnCitizen(occ, 'neutral', spawnP, undefined, sk.factionB);
        unit.state = 'chase';
        this.triggerSpeech(unit, `Assaulting ${sk.locationName}! Breach line!`);
      }
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      const effectiveDt = dt * timeDilationFactor;
      const stats = this.baseStats[unit.occupation];

      // Tick trade cooldown
      if (unit.tradeCooldown > 0) {
        unit.tradeCooldown -= effectiveDt;
      }

      // Update Overhead Health Bar & Faction Sigil
      const hpPct = Math.max(0, Math.min(1, unit.health / unit.maxHealth));
      unit.healthBarMesh.scale.set(hpPct, 1, 1);
      if (camera) {
        unit.healthBarMesh.lookAt(camera.position);
      }
      unit.factionBadgeMesh.rotation.y += effectiveDt * 2.5;
      unit.factionBadgeMesh.rotation.x += effectiveDt * 1.2;

      if (unit.speechTimer > 0) {
        unit.speechTimer -= dt;
        if (unit.speechTimer <= 0) unit.speechText = null;
      }

      // Hit flash — frame-accurate visor color pulse
      if (unit.hitFlashTimer > 0) {
        unit.hitFlashTimer -= dt;
        if (unit.hitFlashTimer <= 0) {
          const col = unit.relationship === 'nemesis' ? 0xef4444 : this.social.factions[unit.faction].colorHex;
          (unit.visorMesh.material as THREE.MeshBasicMaterial).color.setHex(col);
        }
      }

      // Distance to Player
      const distToPlayer = unit.position.distanceTo(playerPos);
      const toPlayer = playerPos.clone().sub(unit.position);
      toPlayer.y = 0;
      const dirToPlayer = toPlayer.clone().normalize();

      // Look direction
      if (toPlayer.lengthSq() > 0.1) {
        const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        unit.mesh.rotation.y = THREE.MathUtils.damp(unit.mesh.rotation.y, targetAngle, 8, effectiveDt);
      }

      // 3. Faction Dynamics & Inter-NPC Conflict Targeting:
      let targetPos: THREE.Vector3 | null = null;
      let targetIsPlayer = false;

      if (unit.relationship === 'nemesis') {
        targetPos = playerPos;
        targetIsPlayer = true;
      } else if (unit.escortingPlayer) {
        // Find any threat to player
        const threat = this.units.find((u) => u !== unit && (u.relationship === 'nemesis' || u.occupation === 'anomaly_hunter'));
        if (threat) {
          targetPos = threat.position;
        } else if (distToPlayer > 4.5) {
          // Follow player in escort formation
          targetPos = playerPos.clone().add(new THREE.Vector3(2.5, 0, 2.5));
        }
      } else if (unit.relationship === 'ally') {
        const threat = this.units.find((u) => u.relationship === 'nemesis' || u.occupation === 'anomaly_hunter');
        if (threat) targetPos = threat.position;
      } else {
        // Dynamic Skirmish Priority Targeting
        const activeSkirmishForUnit = this.social.activeSkirmishes.find(
          (sk) => sk.status === 'active' && (sk.factionA === unit.faction || sk.factionB === unit.faction)
        );

        if (activeSkirmishForUnit) {
          const enemyFaction = activeSkirmishForUnit.factionA === unit.faction
            ? activeSkirmishForUnit.factionB
            : activeSkirmishForUnit.factionA;

          // Find enemy skirmisher within 38m
          const enemySkirmisher = this.units.find(
            (other) => other !== unit && other.faction === enemyFaction && unit.position.distanceTo(other.position) < 38
          );

          if (enemySkirmisher) {
            targetPos = enemySkirmisher.position;
            if (Math.random() < 0.003 && unit.speechTimer <= 0) {
              const speechLines = SKIRMISH_SPEECH[unit.faction] || [];
              if (speechLines.length > 0) {
                this.triggerSpeech(unit, speechLines[Math.floor(Math.random() * speechLines.length)]);
              }
            }
          } else {
            // Move toward skirmish arena center
            const skCenter = new THREE.Vector3(...activeSkirmishForUnit.position);
            if (unit.position.distanceTo(skCenter) > 6.0) {
              targetPos = skCenter;
            }
          }
        }

        // Standard Rival / Enemy Faction Warfare if not in active skirmish target
        if (!targetPos) {
          const factionDef = this.social.factions[unit.faction];
          const enemyFactionUnit = this.units.find(
            (other) =>
              other !== unit &&
              (factionDef.enemies.includes(other.faction) || this.social.getTrust(unit.id, other.id) < -15) &&
              unit.position.distanceTo(other.position) < 26
          );

          if (enemyFactionUnit) {
            targetPos = enemyFactionUnit.position;
          } else if (unit.relationship === 'rival' && distToPlayer < 10) {
            targetPos = playerPos;
            targetIsPlayer = true;
          }
        }
      }

      unit.jobTimer -= effectiveDt;

      // 3. Behavior State Machine
      switch (unit.state) {
        case 'roam': {
          if (unit.jobTimer <= 0) {
            unit.state = 'job_task';
            unit.jobTimer = 5.0 + Math.random() * 5.0;
            const lines = JOB_SPEECH[unit.occupation];
            this.triggerSpeech(unit, lines[Math.floor(Math.random() * lines.length)]);
          }

          if (targetPos) {
            unit.state = 'chase';
          }
          break;
        }

        case 'job_task': {
          if (unit.occupation === 'courier' && unit.canWallRun) {
            const nearbyWall = city.findNearbyWallRun(unit.position, 2.8);
            if (nearbyWall && nearbyWall.normal) {
              unit.state = 'wall_run';
              unit.wallRunTimer = 2.5;
            }
          }

          if (unit.jobTimer <= 0) {
            unit.state = 'roam';
            unit.jobTimer = 6.0;
          }
          break;
        }

        case 'chase': {
          if (targetPos) {
            const toTarget = targetPos.clone().sub(unit.position);
            toTarget.y = 0;
            const dist = toTarget.length();
            const dir = toTarget.clone().normalize();

            if (dist > (unit.escortingPlayer && !targetIsPlayer ? 3.5 : 7)) {
              unit.velocity.x = dir.x * stats.speed;
              unit.velocity.z = dir.z * stats.speed;
            } else {
              const strafe = new THREE.Vector3(-dir.z, 0, dir.x);
              unit.velocity.x = strafe.x * stats.speed * 0.7;
              unit.velocity.z = strafe.z * stats.speed * 0.7;
            }

            // Bullet-climb: jump toward elevated nearby projectiles as climbing footholds
            if (unit.learnedBehaviors.has('bullet_climb') && projectiles.projectiles.length > 0) {
              const nearbyProj = projectiles.projectiles.find(p => p.position.distanceTo(unit.position) < 8 && !p.isPlayerOwned);
              if (nearbyProj && nearbyProj.position.y > unit.position.y + 1.5) {
                unit.velocity.y = Math.max(unit.velocity.y, 12);
              }
            }

            // Flank: approach from perpendicular angle when close
            if (unit.learnedBehaviors.has('flank') && dist < 15 && targetPos) {
              const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(unit.id.charCodeAt(4) % 2 === 0 ? 8 : -8);
              const flankTarget = targetPos.clone().add(perp);
              const toFlank = flankTarget.sub(unit.position);
              toFlank.y = 0;
              const flankDir = toFlank.normalize();
              unit.velocity.x = flankDir.x * stats.speed;
              unit.velocity.z = flankDir.z * stats.speed;
            }

            unit.attackCooldown -= effectiveDt;
            if (unit.attackCooldown <= 0 && dist < 30 && (!unit.escortingPlayer || targetPos !== playerPos)) {
              unit.state = 'attack_windup';
              unit.windupTimer = 0.45;
              unit.eyeLight.intensity = 3.0;
            }
          } else {
            unit.state = 'roam';
          }
          break;
        }

        case 'wall_run': {
          unit.wallRunTimer -= effectiveDt;
          unit.velocity.y = 0;
          if (unit.wallRunTimer <= 0) {
            unit.state = 'roam';
            unit.velocity.y = 9.0;
          }
          break;
        }

        case 'attack_windup': {
          unit.velocity.x *= 0.8;
          unit.velocity.z *= 0.8;
          unit.windupTimer -= effectiveDt;

          if (unit.windupTimer <= 0) {
            unit.state = 'chase';
            unit.attackCooldown = stats.attackInterval;
            unit.eyeLight.intensity = 0.6;

            const projOrigin = unit.position.clone().add(new THREE.Vector3(0, 1.6, 0));
            const dest = targetPos ? targetPos.clone().add(new THREE.Vector3(0, 1.0, 0)) : playerPos;
            const shootDir = dest.sub(projOrigin).normalize();

            projectiles.spawnProjectile(
              projOrigin,
              shootDir,
              30,
              stats.damage,
              unit.relationship === 'ally' || unit.escortingPlayer === true,
              unit.relationship === 'ally' ? 0x10b981 : unit.relationship === 'nemesis' ? 0xef4444 : this.social.factions[unit.faction].colorHex
            );
          }
          break;
        }
      }

      // Physics
      unit.velocity.y -= 26 * effectiveDt;
      unit.position.addScaledVector(unit.velocity, effectiveDt);

      const ground = city.getGroundHeight(unit.position, 0.5);
      const floorY = ground.height > -900 ? ground.height : 20;
      if (unit.position.y <= floorY) {
        unit.position.y = floorY;
        unit.velocity.y = 0;
        unit.isGrounded = true;
      }
      if (unit.position.y < 10) {
        unit.position.set((Math.random() - 0.5) * 20, 22, (Math.random() - 0.5) * 20);
        unit.velocity.set(0, 0, 0);
      }

      unit.mesh.position.copy(unit.position);

      // 4. Cyber-Pet Active Behaviors
      if (unit.pet) {
        const petOffset = unit.pet.type === 'recon_drone'
          ? new THREE.Vector3(0.6, 2.2 + Math.sin(Date.now() * 0.005) * 0.15, -0.4)
          : new THREE.Vector3(0.7, 0, 0.5);

        const targetPetPos = unit.position.clone().add(petOffset);
        unit.pet.position.lerp(targetPetPos, dt * 10);
        unit.pet.mesh.position.copy(unit.pet.position);

        unit.pet.attackCooldown -= effectiveDt;
        if (unit.pet.attackCooldown <= 0 && targetPos) {
          unit.pet.attackCooldown = 3.5;
          const petShootDir = targetPos.clone().sub(unit.pet.position).normalize();
          projectiles.spawnProjectile(
            unit.pet.position.clone(),
            petShootDir,
            38,
            12,
            unit.relationship === 'ally' || unit.escortingPlayer === true,
            this.social.factions[unit.faction].colorHex
          );
        }
      }

      // Melee collision damage on player
      if (targetIsPlayer && distToPlayer < 1.6 && unit.attackCooldown <= 0.2) {
        hitsOnPlayer++;
        damageDealt += 16;
        unit.attackCooldown = 1.0;
      }
    }

    return { hitsOnPlayer, damageDealt, shardDrops };
  }

  public interactWithNearbyCitizen(playerPos: THREE.Vector3): {
    success: boolean;
    unit: AIUnit | null;
    text: string;
    trust: number;
    shardGift: number;
  } {
    for (const unit of this.units) {
      if (unit.position.distanceTo(playerPos) < 4.2) {
        const trust = this.social.getTrust(unit.id, 'player');
        if (unit.relationship === 'nemesis') {
          return { success: false, unit, text: `${unit.name}: 'Target locked! Die, anomaly runner!'`, trust: -100, shardGift: 0 };
        }

        const shards = unit.relationship === 'ally' ? 2 : 1;
        this.social.modifyTrust(unit.id, 'player', 10);
        return {
          success: true,
          unit,
          text: `Contact established with ${unit.name} [${this.social.factions[unit.faction].name}].`,
          trust,
          shardGift: shards,
        };
      }
    }
    return { success: false, unit: null, text: 'No citizens within 4m radius.', trust: 0, shardGift: 0 };
  }

  public triggerSpeech(unit: AIUnit, text: string): void {
    unit.speechText = text;
    unit.speechTimer = 4.5;
    this.addChat(unit.name, text, unit.relationship);
  }

  private addChat(sender: string, text: string, relationship: NPCRelationship): void {
    this.recentChatLines.unshift({ sender, text, time: Date.now(), relationship });
    if (this.recentChatLines.length > 6) {
      this.recentChatLines.pop();
    }
  }

  public damageCitizen(
    unit: AIUnit,
    damage: number,
    knockback: THREE.Vector3,
    attackerFaction: FactionId | 'player' = 'player'
  ): { killed: boolean; shardReward: number } {
    unit.health -= damage;
    unit.velocity.add(knockback);

    const isPlayer = attackerFaction === 'player';
    if (isPlayer) {
      this.social.modifyTrust(unit.id, 'player', -35);
      this.social.modifyPlayerReputation(unit.faction, -20);

      if (unit.relationship === 'ally' || unit.relationship === 'neutral') {
        unit.relationship = 'nemesis';
        this.triggerSpeech(unit, 'Traitor! You turned your weapons on me!');
      }
    }

    (unit.visorMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    unit.hitFlashTimer = 0.08;

    const killed = unit.health <= 0;

    // Report to Skirmish Director
    this.social.recordSkirmishCombat(
      attackerFaction as any,
      unit.faction,
      damage,
      isPlayer,
      killed,
      [unit.position.x, unit.position.y, unit.position.z]
    );

    if (killed) {
      this.destroyCitizen(unit);
      return {
        killed: true,
        shardReward: unit.occupation === 'anomaly_hunter' ? 4 : 2,
      };
    }

    return { killed: false, shardReward: 0 };
  }

  public destroyCitizen(unit: AIUnit): void {
    const idx = this.units.indexOf(unit);
    if (idx !== -1) {
      this.units.splice(idx, 1);
      this.group.remove(unit.mesh);
      if (unit.pet) {
        this.group.remove(unit.pet.mesh);
      }
    }
  }

  public clear(): void {
    for (const u of this.units) {
      this.group.remove(u.mesh);
      if (u.pet) this.group.remove(u.pet.mesh);
    }
    this.units = [];
  }
}
