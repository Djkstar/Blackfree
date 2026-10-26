/**
 * Blackfree: Anomaly Protocol - Master Game Engine (Blackfree 2.0 Audited)
 * Full 3D particle and visual execution for all 15 abilities, 3D bullet tracers,
 * NPC dialogue interactions, and bulletproof input syncing.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameStats, OriginType, WeaponId, FloatingText, CityEvent } from '../types.ts';
import { sound } from './audio.ts';
import { InputManager } from './input.ts';
import { CityManager } from './city.ts';
import { WeaponSystem } from './weapons.ts';
import { PlayerController } from './player.ts';
import { ProjectileManager } from './projectiles.ts';
import { AIManager, AIUnit } from './ai.ts';
import { SkillTreeManager } from './mutations.ts';
import { GachaManager } from './gacha.ts';
import { InstabilityDirector } from './instability.ts';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class GameEngine {
  private mount: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public input: InputManager;
  public city: CityManager;
  public weapons: WeaponSystem;
  public player: PlayerController;
  public projectiles: ProjectileManager;
  public ai: AIManager;
  public skills: SkillTreeManager;
  public gacha: GachaManager;
  public instability: InstabilityDirector;

  // State
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public stats: GameStats;
  public floatingTexts: FloatingText[] = [];
  public cityEvents: CityEvent[] = [];

  // Hitstop & Juice
  private hitstopTimer: number = 0;
  private screenShakeIntensity: number = 0;
  private lastTime: number = 0;
  private frameId: number = 0;

  // Particle Pool
  private particles: Particle[] = [];
  private particlePoints: THREE.Points;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private readonly MAX_PARTICLES = 350;

  // Active 3D Bullet Tracers
  private tracerLines: { line: THREE.Line; life: number; maxLife: number }[] = [];

  // Visual Effect Group
  private vfxGroup: THREE.Group;

  // Callbacks for UI updates
  public onStateUpdate?: (
    stats: GameStats,
    player: PlayerController,
    weapons: WeaponSystem,
    gacha: GachaManager,
    aiUnits: AIUnit[],
    isPointerLocked: boolean
  ) => void;
  public onGameOver?: (stats: GameStats, reason: 'elimination' | 'system_wipe') => void;

  constructor(mount: HTMLElement, chosenOrigin: OriginType) {
    this.mount = mount;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.015);

    this.camera = new THREE.PerspectiveCamera(85, mount.clientWidth / mount.clientHeight, 0.1, 350);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    keyLight.position.set(40, 80, 50);
    keyLight.castShadow = !isSoftwareGl;
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0x090d16, 0.7);
    this.scene.add(hemiLight);

    // Subsystems
    this.input = new InputManager();
    this.city = new CityManager();
    this.weapons = new WeaponSystem();
    this.player = new PlayerController(this.camera, chosenOrigin);
    this.projectiles = new ProjectileManager();
    this.ai = new AIManager();
    this.skills = new SkillTreeManager(chosenOrigin);
    this.gacha = new GachaManager(chosenOrigin);
    this.instability = new InstabilityDirector();

    this.vfxGroup = new THREE.Group();
    this.scene.add(this.vfxGroup);

    this.camera.add(this.weapons.viewmodelContainer);
    this.scene.add(this.camera);

    this.scene.add(this.city.group);
    this.scene.add(this.projectiles.group);
    this.scene.add(this.ai.group);
    this.scene.add(this.instability.group);

    // Particle pool
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(this.MAX_PARTICLES * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.particlePoints = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particlePoints);

    this.stats = {
      kills: 0,
      stylePoints: 0,
      styleRank: 'FRESH',
      currentMultiplier: 1.0,
      instability: 0,
      aiGeneration: 1,
      evolutionShards: 5,
      timeSurvived: 0,
      mutationsTriggered: 0,
      activeOrigin: chosenOrigin,
      unlockedAbilitiesCount: 3,
    };

    this.input.attach(this.renderer.domElement);
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.spawnInitialPopulation();
  }

  private spawnInitialPopulation(): void {
    this.ai.spawnCitizen('netrunner', 'neutral', new THREE.Vector3(12, 22, -14), 'Vex_Netrunner');
    this.ai.spawnCitizen('courier', 'ally', new THREE.Vector3(-14, 22, 10), 'Kael_Courier');
    this.ai.spawnCitizen('syndicate_merc', 'rival', new THREE.Vector3(25, 22, 15), 'Rift_Merc');
    this.ai.spawnCitizen('anomaly_hunter', 'nemesis', new THREE.Vector3(0, 36, -48), 'Apex_Void');
  }

  public start(): void {
    sound.init();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.input.exitPointerLock();
    } else {
      this.input.requestPointerLock();
      this.lastTime = performance.now();
    }
  }

  public switchOrigin(origin: OriginType): void {
    this.stats.activeOrigin = origin;
    this.player.origin = origin;
    this.skills.reset(origin);
    this.gacha.reset(origin);
  }

  private handleResize(): void {
    if (!this.mount) return;
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private loop(): void {
    if (!this.isRunning) return;
    this.frameId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (this.isPaused) return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number): void {
    const mouseDelta = this.input.update(dt);

    // Number keys / Wheel weapon switching
    if (this.input.isJustPressed('Digit1')) this.weapons.switchWeapon('katana');
    if (this.input.isJustPressed('Digit2')) this.weapons.switchWeapon('rifle');
    if (this.input.isJustPressed('Digit3')) this.weapons.switchWeapon('revolver');
    if (this.input.isJustPressed('Digit4')) this.weapons.switchWeapon('shotgun');
    if (mouseDelta.wheel > 20) this.cycleNextWeapon();
    if (mouseDelta.wheel < -20) this.cyclePrevWeapon();

    if (this.input.isJustPressed('KeyR')) this.weapons.startReload();
    this.weapons.isAds = this.input.isMouseHeld(2);

    // Key F: Interact with nearby citizen!
    if (this.input.isJustPressed('KeyF')) {
      const talk = this.ai.interactWithNearbyCitizen(this.player.position);
      if (talk.success) {
        this.addFloatingText(talk.text, this.player.position, '#10b981');
        this.stats.evolutionShards += talk.shardGift;
        this.skills.addShards(talk.shardGift);
        this.addCityEvent(talk.text, 'social');
        sound.playMutationChime();
      } else {
        this.addFloatingText(talk.text, this.player.position, '#94a3b8');
      }
    }

    const timeDilationFactor = this.player.isTimeDilated ? 0.35 : 1.0;
    const computedStats = this.skills.getComputedStats();

    this.gacha.update(dt);

    const isMoving = this.input.isHeld('KeyW') || this.input.isHeld('KeyS') || this.input.isHeld('KeyA') || this.input.isHeld('KeyD');
    const abilityExec = this.player.update(dt, this.input, this.city, this.gacha, computedStats.speed);

    // Execute 3D Visual Effects for Abilities
    if (abilityExec.executedAbilityName) {
      this.addFloatingText(abilityExec.executedAbilityName.toUpperCase(), this.player.position, '#38bdf8');
      this.addCityEvent(`${abilityExec.executedAbilityName} unleashed!`, 'combat');
    }

    if (abilityExec.triggerDecoy && abilityExec.decoyPosition) {
      this.spawnDecoyHologram(abilityExec.decoyPosition);
    }

    if (abilityExec.triggerGroundSlam) {
      this.spawnSeismicGroundSlam(this.player.position);
    }

    if (abilityExec.triggerSingularity) {
      this.spawnVortexSingularity(this.player.position);
    }

    if (abilityExec.triggerSwarm) {
      this.spawnNaniteSeekerSwarm(this.player.position);
    }

    if (abilityExec.triggerDimensionalSlash) {
      this.spawnDimensionalSlashWave(this.player.position, this.camera);
    }

    if (abilityExec.triggerRepulsor) {
      this.spawnRepulsorShockwave(this.player.position);
    }

    // Weapons viewmodel update
    const speedMult = this.player.isOverdriveActive ? 2.8 : 1.0;
    this.weapons.update(dt * speedMult, mouseDelta.dx, mouseDelta.dy, isMoving, this.player.moveTime);

    // Attack (LMB)
    if (this.input.isMouseHeld(0)) {
      this.handlePlayerAttack(computedStats.damage);
    }

    // Check Loot Crate claims
    for (const crate of this.city.lootCrates) {
      if (!crate.claimed) {
        const dist = this.player.position.distanceTo(new THREE.Vector3(crate.x, crate.y, crate.z));
        if (dist < 2.8) {
          const shards = this.city.claimCrate(crate.id);
          if (shards > 0) {
            this.stats.evolutionShards += shards;
            this.skills.addShards(shards);
            sound.playMutationChime();
            this.addFloatingText(`+${shards} SHARDS SECURED!`, this.player.position, '#10b981');
            this.addCityEvent(`Loot crate secured (+${shards} Shards)`, 'loot');
          }
        }
      }
    }

    this.projectiles.update(dt, timeDilationFactor);

    const aiImpact = this.ai.update(dt, this.player.position, this.city, this.projectiles, timeDilationFactor);
    if (aiImpact.damageDealt > 0) {
      this.player.takeDamage(aiImpact.damageDealt);
      this.screenShakeIntensity = 0.35;
    }

    // Projectile collisions with player
    for (let i = this.projectiles.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles.projectiles[i];
      if (!p.isPlayerOwned) {
        if (p.position.distanceTo(this.player.position) < 1.6) {
          this.player.takeDamage(p.damage);
          this.spawnParticleBurst(p.position, 0xef4444, 8);
          this.projectiles.destroyProjectile(i);
          this.screenShakeIntensity = 0.25;
        }
      }
    }

    // Instability
    const instResult = this.instability.update(dt);
    if (instResult.triggerApexSpawn && this.ai.units.length < 8) {
      const spawnP = new THREE.Vector3((Math.random() - 0.5) * 40, 28, (Math.random() - 0.5) * 40);
      this.ai.spawnCitizen('anomaly_hunter', 'nemesis', spawnP, 'Apex_Anomaly');
      this.addCityEvent('Spatial Tear opened! Apex Hunter arrived.', 'anomaly');
    }

    if (instResult.triggerSystemWipe) {
      this.triggerGameOver('system_wipe');
      return;
    }

    if (this.player.isDead) {
      this.triggerGameOver('elimination');
      return;
    }

    this.skills.update(dt, this.instability.instability);

    // Screen Shake
    if (this.screenShakeIntensity > 0) {
      this.camera.rotation.z = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 3.5);
    } else {
      this.camera.rotation.z = 0;
    }

    this.updateParticles(dt);
    this.updateTracers(dt);
    this.updateFloatingTexts(dt);

    this.stats.stylePoints = this.player.stylePoints;
    this.stats.styleRank = this.player.styleRank;
    this.stats.instability = Math.round(this.instability.instability);
    this.stats.aiGeneration = this.ai.currentGeneration;
    this.stats.evolutionShards = this.skills.evolutionShards;
    this.stats.timeSurvived += dt;
    this.stats.unlockedAbilitiesCount = this.gacha.unlockedAbilities.size;

    if (this.onStateUpdate) {
      this.onStateUpdate(
        this.stats,
        this.player,
        this.weapons,
        this.gacha,
        this.ai.units,
        this.input.isPointerLocked
      );
    }
  }

  private handlePlayerAttack(damageMultiplier: number): void {
    const attackResult = this.weapons.triggerAttack(damageMultiplier);
    if (!attackResult.success) return;

    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const eyePos = this.camera.position.clone();

    if (attackResult.isMelee) {
      const parried = this.projectiles.checkParry(this.player.position, lookDir);
      if (parried) {
        this.hitstopTimer = 0.08;
        this.player.addStylePoints(600);
        this.addFloatingText('+ PARRY!', this.player.position, '#38bdf8');
        this.screenShakeIntensity = 0.45;
        this.addCityEvent('Frame-perfect Katana Parry reflected!', 'combat');
      }

      for (const unit of this.ai.units) {
        const dist = unit.position.distanceTo(this.player.position);
        if (dist < attackResult.def.range) {
          const toUnit = unit.position.clone().sub(this.player.position).normalize();
          if (lookDir.dot(toUnit) > 0.45) {
            sound.playKatanaHit();
            const knockback = lookDir.clone().multiplyScalar(15);
            const dmgResult = this.ai.damageCitizen(unit, attackResult.def.damage, knockback);
            this.spawnParticleBurst(unit.position, 0x06b6d4, 16);
            this.hitstopTimer = 0.05;
            this.player.addStylePoints(220);
            this.addFloatingText(Math.round(attackResult.def.damage).toString(), unit.position, '#06b6d4');

            if (dmgResult.killed) {
              this.onCitizenNeutralized(dmgResult.shardReward, unit.name);
            }
          }
        }
      }
    } else {
      // Hitscan Firearms with 3D Tracer Lines
      const pellets = attackResult.def.pellets || 1;
      const baseSpread = attackResult.def.spread || 0;

      for (let p = 0; p < pellets; p++) {
        let shotDir = lookDir.clone();
        if (baseSpread > 0) {
          shotDir.x += (Math.random() - 0.5) * baseSpread;
          shotDir.y += (Math.random() - 0.5) * baseSpread;
          shotDir.z += (Math.random() - 0.5) * baseSpread;
          shotDir.normalize();
        }

        const raycaster = new THREE.Raycaster(eyePos, shotDir, 0.5, attackResult.def.range);
        let closestHitDist = 999;
        let hitUnit: AIUnit | null = null;
        let hitPoint = eyePos.clone().addScaledVector(shotDir, attackResult.def.range);

        for (const unit of this.ai.units) {
          const unitBox = new THREE.Box3().setFromObject(unit.mesh);
          const hit = raycaster.ray.intersectsBox(unitBox);
          if (hit) {
            const dist = eyePos.distanceTo(unit.position);
            if (dist < closestHitDist) {
              closestHitDist = dist;
              hitUnit = unit;
              hitPoint = unit.position.clone();
            }
          }
        }

        // Spawn 3D Bullet Tracer
        this.spawnBulletTracer(eyePos.clone().add(new THREE.Vector3(0.2, -0.2, -0.4)), hitPoint, attackResult.def.accentColor);

        if (hitUnit) {
          sound.playHitMarker();
          const knockback = shotDir.clone().multiplyScalar(attackResult.def.id === 'shotgun' ? 14 : 6);
          const dmgResult = this.ai.damageCitizen(hitUnit, attackResult.def.damage, knockback);
          this.spawnParticleBurst(hitUnit.position, 0xf59e0b, 7);
          this.player.addStylePoints(attackResult.def.id === 'revolver' ? 180 : 75);
          this.addFloatingText(Math.round(attackResult.def.damage).toString(), hitUnit.position, attackResult.def.accentColor);

          if (dmgResult.killed) {
            this.onCitizenNeutralized(dmgResult.shardReward, hitUnit.name);
          }
        }
      }

      this.screenShakeIntensity = attackResult.def.id === 'revolver' ? 0.35 : 0.15;
    }
  }

  // 3D Visual Effects Generators
  private spawnBulletTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: string): void {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geo, mat);
    this.vfxGroup.add(line);
    this.tracerLines.push({ line, life: 0, maxLife: 0.12 });
  }

  private updateTracers(dt: number): void {
    for (let i = this.tracerLines.length - 1; i >= 0; i--) {
      const t = this.tracerLines[i];
      t.life += dt;
      (t.line.material as THREE.LineBasicMaterial).opacity = 1 - t.life / t.maxLife;
      if (t.life >= t.maxLife) {
        this.vfxGroup.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracerLines.splice(i, 1);
      }
    }
  }

  private spawnDecoyHologram(pos: THREE.Vector3): void {
    const geo = new THREE.BoxGeometry(0.8, 1.8, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.8 });
    const decoy = new THREE.Mesh(geo, mat);
    decoy.position.copy(pos);
    decoy.position.y += 0.9;
    this.vfxGroup.add(decoy);

    setTimeout(() => {
      this.vfxGroup.remove(decoy);
      geo.dispose();
      mat.dispose();
    }, 4000);
  }

  private spawnSeismicGroundSlam(pos: THREE.Vector3): void {
    this.spawnParticleBurst(pos, 0x8b5cf6, 35);
    this.screenShakeIntensity = 0.6;

    // Damage and launch all nearby enemies in a 14m radius!
    for (const unit of this.ai.units) {
      const dist = unit.position.distanceTo(pos);
      if (dist < 14.0) {
        const knock = unit.position.clone().sub(pos).normalize().multiplyScalar(22);
        knock.y = 16.0; // blast up into air!
        const dmg = this.ai.damageCitizen(unit, 65, knock);
        this.addFloatingText('65', unit.position, '#8b5cf6');
        if (dmg.killed) this.onCitizenNeutralized(dmg.shardReward, unit.name);
      }
    }
  }

  private spawnVortexSingularity(pos: THREE.Vector3): void {
    const geo = new THREE.TorusGeometry(3.0, 0.3, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 1.5;
    this.vfxGroup.add(ring);

    // Pull in nearby enemies
    const pullInterval = setInterval(() => {
      for (const unit of this.ai.units) {
        if (unit.position.distanceTo(ring.position) < 18.0) {
          const pullDir = ring.position.clone().sub(unit.position).normalize().multiplyScalar(12);
          unit.velocity.add(pullDir);
        }
      }
    }, 100);

    setTimeout(() => {
      clearInterval(pullInterval);
      this.vfxGroup.remove(ring);
      geo.dispose();
      mat.dispose();
    }, 4500);
  }

  private spawnNaniteSeekerSwarm(pos: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(angle), 0.2, Math.sin(angle));
      this.projectiles.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 1.2, 0)), dir, 25, 30, true, 0x10b981);
    }
  }

  private spawnDimensionalSlashWave(pos: THREE.Vector3, camera: THREE.PerspectiveCamera): void {
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    this.projectiles.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 1.4, 0)), lookDir, 45, 120, true, 0xec4899);
    this.screenShakeIntensity = 0.5;
  }

  private spawnRepulsorShockwave(pos: THREE.Vector3): void {
    this.spawnParticleBurst(pos, 0xf59e0b, 30);
    // Reflect all enemy projectiles within 20m!
    for (const p of this.projectiles.projectiles) {
      if (!p.isPlayerOwned && p.position.distanceTo(pos) < 22) {
        p.isPlayerOwned = true;
        p.isParried = true;
        p.damage *= 2;
        p.velocity.negate().multiplyScalar(1.5);
      }
    }
  }

  private onCitizenNeutralized(shardReward: number, name: string): void {
    this.stats.kills++;
    this.skills.addShards(shardReward);
    this.stats.evolutionShards += shardReward;
    this.player.addStylePoints(450);
    this.instability.addInstability(2.5);
    this.addCityEvent(`${name} neutralized (+${shardReward} Shards)`, 'combat');

    if (this.stats.kills % 4 === 0) {
      this.ai.triggerGenerationalEvolution();
      this.addFloatingText('AI GENERATION EVOLVED!', this.player.position, '#ec4899');
    }
  }

  private addCityEvent(text: string, type: CityEvent['type']): void {
    this.cityEvents.unshift({ id: `ev_${Date.now()}`, text, type, timestamp: Date.now() });
    if (this.cityEvents.length > 8) this.cityEvents.pop();
  }

  private spawnParticleBurst(origin: THREE.Vector3, colorHex: number, count: number): void {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }
      this.particles.push({
        position: origin.clone(),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8 + 2, (Math.random() - 0.5) * 12),
        color: col,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 0.25,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 14 * dt;
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }

    const posAttr = this.particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particlePoints.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.particlePositions[i * 3] = p.position.x;
        this.particlePositions[i * 3 + 1] = p.position.y;
        this.particlePositions[i * 3 + 2] = p.position.z;

        this.particleColors[i * 3] = p.color.r;
        this.particleColors[i * 3 + 1] = p.color.g;
        this.particleColors[i * 3 + 2] = p.color.b;
      } else {
        this.particlePositions[i * 3] = 0;
        this.particlePositions[i * 3 + 1] = -999;
        this.particlePositions[i * 3 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public addFloatingText(text: string, pos: THREE.Vector3, color: string): void {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x: pos.x,
      y: pos.y + 1.8,
      z: pos.z,
      color,
      life: 0,
      maxLife: 1.2,
    });
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += dt * 1.5;
      if (ft.life >= ft.maxLife) this.floatingTexts.splice(i, 1);
    }
  }

  private cycleNextWeapon(): void {
    const list: WeaponId[] = ['katana', 'rifle', 'revolver', 'shotgun'];
    const idx = list.indexOf(this.weapons.currentWeaponId);
    this.weapons.switchWeapon(list[(idx + 1) % list.length]);
  }

  private cyclePrevWeapon(): void {
    const list: WeaponId[] = ['katana', 'rifle', 'revolver', 'shotgun'];
    const idx = list.indexOf(this.weapons.currentWeaponId);
    this.weapons.switchWeapon(list[(idx - 1 + list.length) % list.length]);
  }

  private triggerGameOver(reason: 'elimination' | 'system_wipe'): void {
    this.isRunning = false;
    this.input.exitPointerLock();
    if (this.onGameOver) this.onGameOver(this.stats, reason);
  }

  public restart(chosenOrigin: OriginType): void {
    this.stats = {
      kills: 0,
      stylePoints: 0,
      styleRank: 'FRESH',
      currentMultiplier: 1.0,
      instability: 0,
      aiGeneration: 1,
      evolutionShards: 5,
      timeSurvived: 0,
      mutationsTriggered: 0,
      activeOrigin: chosenOrigin,
      unlockedAbilitiesCount: 3,
    };
    this.player.reset();
    this.projectiles.clear();
    this.ai.clear();
    this.instability.reset();
    this.skills.reset(chosenOrigin);
    this.gacha.reset(chosenOrigin);
    this.spawnInitialPopulation();
    this.start();
  }

  public destroy(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.input.detach();
    if (this.mount && this.renderer.domElement.parentNode === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
