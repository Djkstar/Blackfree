/**
 * Blackfree: Anomaly Protocol - Skirmish Conflict VFX Engine
 * High-performance procedural visual effect system for active faction warzones.
 * Manages:
 *  1. Directional ricochet sparks & short-circuit arc discharges (dynamic BufferGeometry points)
 *  2. Soft billowing smoke & smoldering debris plumes (radial gradient alpha points)
 *  3. Dynamic flickering neon conflict lighting & faulty power grid surge simulation
 *  4. Ground blast shockwaves & energy rings in contested territories
 */

import * as THREE from 'three';
import { FactionId, FactionSkirmish, FactionState } from '../types.ts';
import { sound } from './audio.ts';

interface SparkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  groundY: number;
  bounceCount: number;
}

interface SmokeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  initialSize: number;
  currentSize: number;
  maxSize: number;
  opacity: number;
  seed: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
}

interface ConflictLightRig {
  id: string;
  skirmishId: string;
  pointLight: THREE.PointLight;
  fixtureGroup: THREE.Group;
  conduitMesh: THREE.Mesh;
  glowCoreMat: THREE.MeshBasicMaterial;
  flickerTimer: number;
  flickerMode: 'normal' | 'stutter' | 'brownout' | 'surge';
  modeDuration: number;
  baseIntensity: number;
  currentIntensity: number;
  excitement: number; // 0 to 1, increases on combat hits
  colorA: THREE.Color;
  colorB: THREE.Color;
  currentColor: THREE.Color;
  nextAmbientSparkTimer: number;
  nextSmokeTimer: number;
}

export class SkirmishVFXManager {
  public group: THREE.Group;

  // Spark System
  private sparks: SparkParticle[] = [];
  private readonly MAX_SPARKS = 600;
  private sparkPoints: THREE.Points;
  private sparkPositions: Float32Array;
  private sparkColors: Float32Array;
  private sparkSizes: Float32Array;

  // Smoke System
  private smokePuffs: SmokeParticle[] = [];
  private readonly MAX_SMOKE = 350;
  private smokePoints: THREE.Points;
  private smokePositions: Float32Array;
  private smokeColors: Float32Array;
  private smokeSizes: Float32Array;

  // Shockwave Rings
  private shockwaves: ShockwaveRing[] = [];
  private shockwaveGroup: THREE.Group;

  // Conflict Light Rigs (one per active skirmish)
  private lightRigs: Map<string, ConflictLightRig> = new Map();

  // Reusable Math objects to avoid garbage collection
  private tmpVecA = new THREE.Vector3();
  private tmpVecB = new THREE.Vector3();
  private tmpColA = new THREE.Color();
  private tmpColB = new THREE.Color();

  constructor() {
    this.group = new THREE.Group();
    this.shockwaveGroup = new THREE.Group();
    this.group.add(this.shockwaveGroup);

    // 1. Initialize Spark Points Mesh
    const sparkTex = this.createSparkTexture();
    const sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkColors = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkSizes = new Float32Array(this.MAX_SPARKS);

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 3));
    sparkGeo.setAttribute('size', new THREE.BufferAttribute(this.sparkSizes, 1));

    const sparkMat = new THREE.PointsMaterial({
      map: sparkTex,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    this.group.add(this.sparkPoints);

    // 2. Initialize Smoke Points Mesh
    const smokeTex = this.createSmokeTexture();
    const smokeGeo = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.MAX_SMOKE * 3);
    this.smokeColors = new Float32Array(this.MAX_SMOKE * 3);
    this.smokeSizes = new Float32Array(this.MAX_SMOKE);

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    smokeGeo.setAttribute('color', new THREE.BufferAttribute(this.smokeColors, 3));
    smokeGeo.setAttribute('size', new THREE.BufferAttribute(this.smokeSizes, 1));

    const smokeMat = new THREE.PointsMaterial({
      map: smokeTex,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    this.smokePoints = new THREE.Points(smokeGeo, smokeMat);
    this.group.add(this.smokePoints);
  }

  /**
   * Procedural glowing starburst / arc spark texture
   */
  private createSparkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const cx = 32;
    const cy = 32;

    // Glowing core
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.2, 'rgba(255, 240, 200, 0.9)');
    radGrad.addColorStop(0.5, 'rgba(255, 170, 70, 0.4)');
    radGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 64, 64);

    // Cross star flare
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx, 60);
    ctx.moveTo(4, cy);
    ctx.lineTo(60, cy);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Procedural soft volumetric radial smoke gradient texture
   */
  private createSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cx = 64;
    const cy = 64;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
    grad.addColorStop(0, 'rgba(230, 235, 245, 0.85)');
    grad.addColorStop(0.25, 'rgba(160, 170, 190, 0.6)');
    grad.addColorStop(0.6, 'rgba(90, 100, 120, 0.25)');
    grad.addColorStop(0.85, 'rgba(40, 48, 60, 0.08)');
    grad.addColorStop(1, 'rgba(15, 20, 28, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Spawns a spray of high-velocity sparks at a given position.
   */
  public spawnSparks(
    pos: THREE.Vector3,
    dir: THREE.Vector3 | null,
    colorHex: number,
    count: number,
    speedMultiplier: number = 1.0,
    groundY: number = 20.0
  ): void {
    const startColor = new THREE.Color(colorHex);
    // Cool-down color is deep glowing orange ember
    const emberColor = new THREE.Color(0xf97316);

    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.MAX_SPARKS) {
        this.sparks.shift();
      }

      let vel: THREE.Vector3;
      if (dir) {
        // Conical spray around direction
        const spread = 0.55;
        vel = new THREE.Vector3(
          dir.x + (Math.random() - 0.5) * spread,
          dir.y + (Math.random() - 0.5) * spread + 0.2,
          dir.z + (Math.random() - 0.5) * spread
        ).normalize();
        vel.multiplyScalar((10 + Math.random() * 18) * speedMultiplier);
      } else {
        // Omnidirectional burst with upward bias
        vel = new THREE.Vector3(
          (Math.random() - 0.5) * 16,
          Math.random() * 14 + 3,
          (Math.random() - 0.5) * 16
        ).multiplyScalar(speedMultiplier);
      }

      this.sparks.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)),
        velocity: vel,
        color: startColor.clone(),
        targetColor: emberColor,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.45,
        size: 0.28 + Math.random() * 0.2,
        groundY,
        bounceCount: 0,
      });
    }
  }

  /**
   * Spawns voluminous expanding smoke puffs at a location.
   */
  public spawnSmoke(
    pos: THREE.Vector3,
    colorHex: number,
    count: number,
    scaleMultiplier: number = 1.0,
    isDarkPlume: boolean = false
  ): void {
    const baseCol = new THREE.Color(colorHex);
    // Darken smoke color to look like real burning dust & chemical smoke
    const smokeCol = isDarkPlume
      ? new THREE.Color(0x1e293b).lerp(baseCol, 0.2)
      : new THREE.Color(0x475569).lerp(baseCol, 0.35);

    for (let i = 0; i < count; i++) {
      if (this.smokePuffs.length >= this.MAX_SMOKE) {
        this.smokePuffs.shift();
      }

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        1.2 + Math.random() * 2.2,
        (Math.random() - 0.5) * 1.8
      );

      const initSize = (0.5 + Math.random() * 0.4) * scaleMultiplier;
      const targetSize = (2.2 + Math.random() * 1.6) * scaleMultiplier;

      this.smokePuffs.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6)),
        velocity: vel,
        color: smokeCol.clone(),
        life: 0,
        maxLife: 1.2 + Math.random() * 1.4,
        initialSize: initSize,
        currentSize: initSize,
        maxSize: targetSize,
        opacity: 0.75,
        seed: Math.random() * 100,
      });
    }
  }

  /**
   * Spawns an expanding neon ground shockwave ring
   */
  public spawnShockwave(pos: THREE.Vector3, colorHex: number, maxRadius: number = 8.0, duration: number = 0.55): void {
    const geo = new THREE.RingGeometry(0.2, 0.9, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(pos.x, pos.y + 0.15, pos.z);
    this.shockwaveGroup.add(mesh);

    this.shockwaves.push({
      mesh,
      material: mat,
      life: 0,
      maxLife: duration,
      startRadius: 0.5,
      endRadius: maxRadius,
    });
  }

  /**
   * Triggered when NPCs land hits or fire heavy weapons during a skirmish.
   */
  public onSkirmishCombatHit(
    pos: [number, number, number],
    attackerFaction: FactionId | 'player',
    defenderFaction: FactionId,
    damage: number,
    wasKilled: boolean,
    factions: Record<FactionId, FactionState>
  ): void {
    const hitVec = new THREE.Vector3(...pos);
    const defCol = factions[defenderFaction]?.colorHex ?? 0x06b6d4;
    const attCol = attackerFaction !== 'player' ? factions[attackerFaction]?.colorHex ?? 0xf59e0b : 0x38bdf8;

    // 1. Sparks spray
    const sparkCount = wasKilled ? 30 : Math.min(22, 6 + Math.floor(damage * 0.45));
    this.spawnSparks(hitVec, null, attCol, sparkCount, wasKilled ? 1.4 : 1.0, hitVec.y - 1.2);

    // 2. Rising smoke plume
    const smokeCount = wasKilled ? 8 : Math.min(5, 2 + Math.floor(damage * 0.12));
    this.spawnSmoke(hitVec, defCol, smokeCount, wasKilled ? 1.5 : 1.0, wasKilled);

    // 3. Shockwave ring if high impact or kill
    if (wasKilled || damage >= 28) {
      this.spawnShockwave(hitVec, attCol, wasKilled ? 9.5 : 5.5, wasKilled ? 0.65 : 0.45);
    }

    // 4. Excite nearest conflict light rig
    for (const rig of this.lightRigs.values()) {
      const dist = hitVec.distanceTo(rig.pointLight.position);
      if (dist < 35) {
        rig.excitement = Math.min(1.0, rig.excitement + (wasKilled ? 0.6 : 0.25));
        // Force an immediate light flash / surge
        if (Math.random() < 0.5 || wasKilled) {
          rig.flickerMode = 'surge';
          rig.modeDuration = 0.12;
          rig.currentIntensity = rig.baseIntensity * 2.8;
          sound.playElectricalSpark();
        }
      }
    }
  }

  /**
   * Update active skirmish visual rigs, lights, and particles
   */
  public update(
    dt: number,
    activeSkirmishes: FactionSkirmish[],
    factions: Record<FactionId, FactionState>,
    playerPos: THREE.Vector3
  ): void {
    const activeIds = new Set(activeSkirmishes.map((s) => s.id));

    // 1. Clean up stale light rigs
    for (const [id, rig] of this.lightRigs.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(rig.fixtureGroup);
        this.group.remove(rig.pointLight);
        rig.pointLight.dispose();
        rig.conduitMesh.geometry.dispose();
        (rig.conduitMesh.material as THREE.Material).dispose();
        rig.glowCoreMat.dispose();
        this.lightRigs.delete(id);
      }
    }

    // 2. Synchronize active skirmish light rigs
    for (const sk of activeSkirmishes) {
      if (sk.status !== 'active') continue;

      let rig = this.lightRigs.get(sk.id);
      const colAHex = factions[sk.factionA].colorHex;
      const colBHex = factions[sk.factionB].colorHex;

      if (!rig) {
        // Create new Conflict Light Rig
        const fixtureGroup = new THREE.Group();
        const basePos = new THREE.Vector3(...sk.position);

        // Hovering / rooftop electrical conduit box
        const conduitGeo = new THREE.BoxGeometry(1.2, 0.8, 0.9);
        const conduitMat = new THREE.MeshStandardMaterial({
          color: 0x111827,
          metalness: 0.9,
          roughness: 0.2,
        });
        const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
        conduitMesh.position.set(0, 4.5, 0);
        fixtureGroup.add(conduitMesh);

        // Exposed sparking neon tube cage
        const cageGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.7, 8, 1, true);
        const glowCoreMat = new THREE.MeshBasicMaterial({
          color: colAHex,
          wireframe: true,
        });
        const cage = new THREE.Mesh(cageGeo, glowCoreMat);
        cage.position.set(0, 4.5, 0);
        fixtureGroup.add(cage);

        fixtureGroup.position.copy(basePos);
        this.group.add(fixtureGroup);

        // Dynamic PointLight
        const pointLight = new THREE.PointLight(colAHex, 2.8, 38, 2.0);
        pointLight.position.set(basePos.x, basePos.y + 4.8, basePos.z);
        pointLight.castShadow = false;
        this.group.add(pointLight);

        rig = {
          id: sk.id,
          skirmishId: sk.id,
          pointLight,
          fixtureGroup,
          conduitMesh,
          glowCoreMat,
          flickerTimer: 0,
          flickerMode: 'normal',
          modeDuration: 0.5,
          baseIntensity: 2.8,
          currentIntensity: 2.8,
          excitement: 0.4,
          colorA: new THREE.Color(colAHex),
          colorB: new THREE.Color(colBHex),
          currentColor: new THREE.Color(colAHex),
          nextAmbientSparkTimer: 0.4 + Math.random() * 0.8,
          nextSmokeTimer: 0.2 + Math.random() * 0.4,
        };
        this.lightRigs.set(sk.id, rig);
      }

      // Update light rig dynamics
      rig.excitement = Math.max(0.1, rig.excitement - dt * 0.15);

      // Interpolate light color between faction A & B based on score
      const totalScore = Math.max(1, sk.scoreA + sk.scoreB);
      const ratioB = sk.scoreB / totalScore;
      rig.currentColor.copy(rig.colorA).lerp(rig.colorB, ratioB);

      // Flickering State Machine
      rig.flickerTimer += dt;
      if (rig.flickerTimer >= rig.modeDuration) {
        rig.flickerTimer = 0;

        // Choose next mode with probability influenced by excitement
        const roll = Math.random();
        const surgeThreshold = 0.85 - rig.excitement * 0.35;
        const brownoutThreshold = 0.65 - rig.excitement * 0.25;
        const stutterThreshold = 0.40 - rig.excitement * 0.2;

        if (roll > surgeThreshold) {
          rig.flickerMode = 'surge';
          rig.modeDuration = 0.08 + Math.random() * 0.12;
          rig.currentIntensity = rig.baseIntensity * (2.2 + Math.random() * 1.5);

          // Violent surge spark shower
          const surgePos = rig.pointLight.position.clone();
          this.spawnSparks(surgePos, null, rig.currentColor.getHex(), 8 + Math.floor(Math.random() * 8), 1.3, sk.position[1]);
          if (surgePos.distanceTo(playerPos) < 40) {
            sound.playElectricalSpark();
          }
        } else if (roll > brownoutThreshold) {
          rig.flickerMode = 'brownout';
          rig.modeDuration = 0.06 + Math.random() * 0.14;
          rig.currentIntensity = rig.baseIntensity * 0.08; // near total darkness
        } else if (roll > stutterThreshold) {
          rig.flickerMode = 'stutter';
          rig.modeDuration = 0.2 + Math.random() * 0.3;
          rig.currentIntensity = rig.baseIntensity * (0.4 + Math.random() * 1.2);
        } else {
          rig.flickerMode = 'normal';
          rig.modeDuration = 0.4 + Math.random() * 0.6;
          rig.currentIntensity = rig.baseIntensity * (0.85 + Math.sin(Date.now() * 0.015) * 0.15);
        }
      }

      // Apply fast micro-flutter inside current mode
      let activeIntensity = rig.currentIntensity;
      if (rig.flickerMode === 'stutter') {
        activeIntensity *= Math.random() > 0.4 ? 1.4 : 0.3;
      }

      rig.pointLight.intensity = activeIntensity;
      rig.pointLight.color.copy(rig.currentColor);
      rig.glowCoreMat.color.copy(rig.currentColor);

      // Ambient Ricochet Sparks in conflict zone
      rig.nextAmbientSparkTimer -= dt;
      if (rig.nextAmbientSparkTimer <= 0) {
        rig.nextAmbientSparkTimer = (0.5 + Math.random() * 0.8) / (1 + rig.excitement * 2);

        // Pick random point along warzone perimeter / buildings
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * sk.radius * 0.85;
        const sparkPos = new THREE.Vector3(
          sk.position[0] + Math.cos(angle) * r,
          sk.position[1] + 1.0 + Math.random() * 6.0,
          sk.position[2] + Math.sin(angle) * r
        );
        const col = Math.random() < 0.5 ? colAHex : colBHex;
        this.spawnSparks(sparkPos, null, col, 4 + Math.floor(Math.random() * 6), 0.9, sk.position[1]);
      }

      // Ambient Rising Smoke & Smolder in conflict zone
      rig.nextSmokeTimer -= dt;
      if (rig.nextSmokeTimer <= 0) {
        rig.nextSmokeTimer = (0.35 + Math.random() * 0.5) / (1 + rig.excitement);

        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * (sk.radius * 0.7);
        const smokePos = new THREE.Vector3(
          sk.position[0] + Math.cos(angle) * r,
          sk.position[1] + 0.3,
          sk.position[2] + Math.sin(angle) * r
        );
        this.spawnSmoke(smokePos, Math.random() < 0.5 ? colAHex : colBHex, 2 + Math.floor(Math.random() * 3), 1.0, false);
      }
    }

    // 3. Update Spark Particles
    this.updateSparks(dt);

    // 4. Update Smoke Particles
    this.updateSmoke(dt);

    // 5. Update Shockwave Rings
    this.updateShockwaves(dt);
  }

  private updateSparks(dt: number): void {
    const timeStep = Math.min(dt, 0.05);

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life += timeStep;

      // Gravity and air drag
      sp.velocity.y -= 22.0 * timeStep;
      sp.velocity.x *= 0.97;
      sp.velocity.z *= 0.97;

      sp.position.addScaledVector(sp.velocity, timeStep);

      // Ground bounce & ricochet
      if (sp.position.y <= sp.groundY) {
        sp.position.y = sp.groundY;
        sp.velocity.y = -sp.velocity.y * 0.42;
        sp.velocity.x *= 0.75;
        sp.velocity.z *= 0.75;
        sp.bounceCount++;

        if (sp.bounceCount > 2 || Math.abs(sp.velocity.y) < 1.0) {
          sp.life = sp.maxLife; // expire on rest
        }
      }

      // Cool from hot start color to ember
      const progress = sp.life / sp.maxLife;
      sp.color.lerp(sp.targetColor, progress * 0.3);

      if (sp.life >= sp.maxLife) {
        this.sparks.splice(i, 1);
      }
    }

    // Write to BufferAttributes
    const posAttr = this.sparkPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.sparkPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.sparkPoints.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < this.MAX_SPARKS; i++) {
      if (i < this.sparks.length) {
        const sp = this.sparks[i];
        this.sparkPositions[i * 3] = sp.position.x;
        this.sparkPositions[i * 3 + 1] = sp.position.y;
        this.sparkPositions[i * 3 + 2] = sp.position.z;

        const fade = 1 - (sp.life / sp.maxLife);
        this.sparkColors[i * 3] = sp.color.r * fade;
        this.sparkColors[i * 3 + 1] = sp.color.g * fade;
        this.sparkColors[i * 3 + 2] = sp.color.b * fade;

        this.sparkSizes[i] = sp.size * (0.4 + 0.6 * fade);
      } else {
        this.sparkPositions[i * 3] = 0;
        this.sparkPositions[i * 3 + 1] = -999;
        this.sparkPositions[i * 3 + 2] = 0;
        this.sparkSizes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private updateSmoke(dt: number): void {
    const timeStep = Math.min(dt, 0.05);

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const sm = this.smokePuffs[i];
      sm.life += timeStep;

      // Gentle upward drift & atmospheric drag
      sm.velocity.y = Math.max(0.6, sm.velocity.y * 0.98);
      sm.position.addScaledVector(sm.velocity, timeStep);

      // Horizontal turbulence sway
      const t = Date.now() * 0.002 + sm.seed;
      sm.position.x += Math.sin(t) * 0.35 * timeStep;
      sm.position.z += Math.cos(t * 1.2) * 0.35 * timeStep;

      // Expand over lifetime
      const progress = sm.life / sm.maxLife;
      sm.currentSize = THREE.MathUtils.lerp(sm.initialSize, sm.maxSize, Math.sqrt(progress));

      if (sm.life >= sm.maxLife) {
        this.smokePuffs.splice(i, 1);
      }
    }

    // Write to BufferAttributes
    const posAttr = this.smokePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.smokePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.smokePoints.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < this.MAX_SMOKE; i++) {
      if (i < this.smokePuffs.length) {
        const sm = this.smokePuffs[i];
        this.smokePositions[i * 3] = sm.position.x;
        this.smokePositions[i * 3 + 1] = sm.position.y;
        this.smokePositions[i * 3 + 2] = sm.position.z;

        // Quadratic fade out
        const p = sm.life / sm.maxLife;
        const alpha = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);

        this.smokeColors[i * 3] = sm.color.r * alpha;
        this.smokeColors[i * 3 + 1] = sm.color.g * alpha;
        this.smokeColors[i * 3 + 2] = sm.color.b * alpha;

        this.smokeSizes[i] = sm.currentSize;
      } else {
        this.smokePositions[i * 3] = 0;
        this.smokePositions[i * 3 + 1] = -999;
        this.smokePositions[i * 3 + 2] = 0;
        this.smokeSizes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const progress = sw.life / sw.maxLife;

      if (progress >= 1.0) {
        this.shockwaveGroup.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const r = THREE.MathUtils.lerp(sw.startRadius, sw.endRadius, Math.sqrt(progress));
      sw.mesh.scale.set(r, r, 1);
      sw.material.opacity = Math.max(0, 0.85 * (1 - progress));
    }
  }

  public destroy(): void {
    for (const rig of this.lightRigs.values()) {
      this.group.remove(rig.fixtureGroup);
      this.group.remove(rig.pointLight);
      rig.pointLight.dispose();
      rig.conduitMesh.geometry.dispose();
      (rig.conduitMesh.material as THREE.Material).dispose();
      rig.glowCoreMat.dispose();
    }
    this.lightRigs.clear();

    for (const sw of this.shockwaves) {
      this.shockwaveGroup.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.material.dispose();
    }
    this.shockwaves = [];

    this.sparkPoints.geometry.dispose();
    (this.sparkPoints.material as THREE.Material).dispose();

    this.smokePoints.geometry.dispose();
    (this.smokePoints.material as THREE.Material).dispose();
  }
}
