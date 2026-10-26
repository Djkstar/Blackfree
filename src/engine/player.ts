/**
 * Blackfree: Anomaly Protocol - Player Kinematics & Ability Execution (Blackfree 2.0)
 */

import * as THREE from 'three';
import { OriginType, StyleRank } from '../types.ts';
import { InputManager } from './input.ts';
import { CityManager } from './city.ts';
import { GachaManager } from './gacha.ts';
import { sound } from './audio.ts';

export interface AbilityExecutionResult {
  executedAbilityName: string | null;
  executedAbilityEffect: string | null;
  triggerGroundSlam: boolean;
  triggerSingularity: boolean;
  triggerSwarm: boolean;
  triggerDimensionalSlash: boolean;
  triggerRepulsor: boolean;
  triggerDecoy: boolean;
  decoyPosition?: THREE.Vector3;
}

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public origin: OriginType = 'chrono';

  // Kinematics & Position
  public position = new THREE.Vector3(0, 22, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public isGrounded: boolean = true;
  public isSliding: boolean = false;
  public isWallRunning: boolean = false;
  public isZeroG: boolean = false;
  public zeroGTimer: number = 0;
  public wallRunNormal = new THREE.Vector3();
  public moveTime: number = 0;

  // Camera orientation
  public pitch: number = 0;
  public yaw: number = 0;
  private targetFov: number = 85;

  // History buffer for Temporal Reversal (3 seconds at ~60fps = 180 entries)
  private history: { pos: THREE.Vector3; health: number; time: number }[] = [];

  // Vitals
  public health: number = 100;
  public maxHealth: number = 100;
  public shield: number = 100;
  public maxShield: number = 100;
  public isDead: boolean = false;

  // Buffs
  public isTimeDilated: boolean = false;
  public timeDilationTimer: number = 0;
  public isOverdriveActive: boolean = false;
  public overdriveTimer: number = 0;
  public isInvulnerable: boolean = false;
  public invulnerableTimer: number = 0;

  // Ground slam pending (replaces setTimeout)
  private groundSlamPending: boolean = false;
  private groundSlamTimer: number = 0;

  // Style System
  public stylePoints: number = 0;
  public styleRank: StyleRank = 'FRESH';
  private styleDecayTimer: number = 0;

  // Constants
  private readonly BASE_SPEED = 14.5;
  private readonly SPRINT_SPEED = 19.5;
  private readonly SLIDE_SPEED = 26.0;
  private readonly WALLRUN_SPEED = 24.0;
  private readonly JUMP_FORCE = 13.5;
  private readonly GRAVITY = 28.0;

  constructor(camera: THREE.PerspectiveCamera, origin: OriginType) {
    this.camera = camera;
    this.origin = origin;
    this.reset();
  }

  public reset(spawnPos?: THREE.Vector3): void {
    this.position.copy(spawnPos || new THREE.Vector3(0, 22, 0));
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.isDead = false;
    this.isSliding = false;
    this.isWallRunning = false;
    this.isZeroG = false;
    this.zeroGTimer = 0;
    this.isTimeDilated = false;
    this.timeDilationTimer = 0;
    this.isOverdriveActive = false;
    this.overdriveTimer = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.groundSlamPending = false;
    this.groundSlamTimer = 0;
    this.stylePoints = 0;
    this.styleRank = 'FRESH';
    this.history = [];
  }

  public update(
    dt: number,
    input: InputManager,
    inputDelta: { dx: number; dy: number },
    city: CityManager,
    gacha: GachaManager,
    speedMultiplier: number = 1.0
  ): AbilityExecutionResult {
    const result: AbilityExecutionResult = {
      executedAbilityName: null,
      executedAbilityEffect: null,
      triggerGroundSlam: false,
      triggerSingularity: false,
      triggerSwarm: false,
      triggerDimensionalSlash: false,
      triggerRepulsor: false,
      triggerDecoy: false,
    };

    if (this.isDead) return result;

    // 1. Camera Look Rotation — use the delta returned from input.update(), not stale fields
    const mouseSens = 0.0024;
    this.yaw -= inputDelta.dx * mouseSens;
    this.pitch -= inputDelta.dy * mouseSens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2.05, Math.PI / 2.05);

    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // FOV Transitions
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.targetFov, 10, dt);
    this.camera.updateProjectionMatrix();

    // 2. Input Direction Vector (Relative to Camera Yaw)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    let moveX = 0;
    let moveZ = 0;
    if (input.isHeld('KeyW')) moveZ += 1;
    if (input.isHeld('KeyS')) moveZ -= 1;
    if (input.isHeld('KeyD')) moveX += 1;
    if (input.isHeld('KeyA')) moveX -= 1;

    const wishDir = new THREE.Vector3().addScaledVector(forward, moveZ).addScaledVector(right, moveX);
    const hasMoveInput = wishDir.lengthSq() > 0.01;
    if (hasMoveInput) wishDir.normalize();

    // 3. Sliding Physics (Shift / C)
    const wantsSlide = (input.isHeld('ShiftLeft') || input.isHeld('KeyC')) && this.isGrounded && hasMoveInput;
    if (wantsSlide && !this.isSliding) {
      this.isSliding = true;
      this.targetFov = 96;
      sound.playDash();
      this.velocity.x = wishDir.x * this.SLIDE_SPEED * speedMultiplier;
      this.velocity.z = wishDir.z * this.SLIDE_SPEED * speedMultiplier;
    } else if (!wantsSlide && this.isSliding) {
      this.isSliding = false;
      this.targetFov = 85;
    }

    // 4. Ground Check & Elevation
    const groundCheck = city.getGroundHeight(this.position, 0.45);
    this.isGrounded = this.position.y <= groundCheck.height + 0.1 && this.velocity.y <= 0.5;
    input.setGrounded(this.isGrounded);

    // Jump Pad Launch
    if (groundCheck.platform?.isJumpPad && this.position.y <= groundCheck.height + 0.5) {
      this.velocity.y = 34.0;
      this.isGrounded = false;
      sound.playJump();
    }

    // 5. Wall-Running
    const nearbyWall = city.findNearbyWallRun(this.position, 2.0);
    if (nearbyWall && nearbyWall.normal && !this.isGrounded && hasMoveInput) {
      if (!this.isWallRunning) {
        this.isWallRunning = true;
        this.wallRunNormal.copy(nearbyWall.normal);
        this.targetFov = 92;
        sound.playDash();
      }
      const wallDir = new THREE.Vector3(-this.wallRunNormal.z, 0, this.wallRunNormal.x);
      if (wallDir.dot(forward) < 0) wallDir.negate();
      this.velocity.x = wallDir.x * this.WALLRUN_SPEED * speedMultiplier;
      this.velocity.z = wallDir.z * this.WALLRUN_SPEED * speedMultiplier;
      this.velocity.y = 0;
    } else if (this.isWallRunning) {
      this.isWallRunning = false;
      this.targetFov = 85;
    }

    // 6. Jumping / Wall-Kicking
    const jumpRequested = input.consumeJumpBuffer() || input.isJustPressed('Space');
    if (jumpRequested) {
      if (this.isWallRunning) {
        this.velocity.y = this.JUMP_FORCE * 1.3;
        this.velocity.addScaledVector(this.wallRunNormal, 15.0);
        this.isWallRunning = false;
        sound.playJump();
      } else if (this.isGrounded || input.hasCoyoteTime()) {
        this.velocity.y = this.JUMP_FORCE;
        this.isGrounded = false;
        sound.playJump();
      }
    }

    // 7. Horizontal Acceleration
    const targetSpeed = this.isSliding ? this.SLIDE_SPEED : input.isHeld('KeyW') ? this.SPRINT_SPEED : this.BASE_SPEED;
    if (!this.isWallRunning) {
      if (hasMoveInput && !this.isSliding) {
        const accelRate = this.isGrounded ? 14 : 5.0;
        this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wishDir.x * targetSpeed * speedMultiplier, accelRate, dt);
        this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wishDir.z * targetSpeed * speedMultiplier, accelRate, dt);
      } else if (!this.isSliding) {
        const dragRate = this.isGrounded ? 12 : 1.8;
        this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, dragRate, dt);
        this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, dragRate, dt);
      }
    }

    // 8. Zero-G Glide
    if (this.zeroGTimer > 0) {
      this.zeroGTimer -= dt;
      this.velocity.y = THREE.MathUtils.damp(this.velocity.y, 0, 4, dt);
    } else if (!this.isGrounded && !this.isWallRunning) {
      this.velocity.y -= this.GRAVITY * dt;
    }

    // 9. Ground Slam deferred trigger (frame-accurate, no setTimeout)
    if (this.groundSlamPending) {
      this.groundSlamTimer -= dt;
      if (this.groundSlamTimer <= 0) {
        this.groundSlamPending = false;
        this.velocity.y = -42;
        result.triggerGroundSlam = true;
        sound.playGravityWell();
      }
    }

    // 10. Position Integration
    this.position.addScaledVector(this.velocity, dt);

    if (this.position.y <= groundCheck.height) {
      this.position.y = groundCheck.height;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    if (this.position.y < -15) {
      this.position.set(0, 24, 0);
      this.velocity.set(0, 6, 0);
      this.takeDamage(15);
      sound.playDash();
    }

    const eyeHeight = this.isSliding ? 0.7 : 1.7;
    this.camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);

    if (hasMoveInput && this.isGrounded) {
      this.moveTime += dt;
    }

    // 11. Temporal History Recorder
    const now = performance.now();
    this.history.push({ pos: this.position.clone(), health: this.health, time: now });
    // Keep ~3 seconds of history at 60fps
    while (this.history.length > 1 && now - this.history[0].time > 3000) {
      this.history.shift();
    }

    // 12. Ability Hotbar Keys (Q, E, Z, X)
    let triggeredSlot: number | null = null;
    if (input.isJustPressed('KeyQ')) triggeredSlot = 0;
    else if (input.isJustPressed('KeyE')) triggeredSlot = 1;
    else if (input.isJustPressed('KeyZ')) triggeredSlot = 2;
    else if (input.isJustPressed('KeyX')) triggeredSlot = 3;

    if (triggeredSlot !== null) {
      const ability = gacha.triggerSlot(triggeredSlot);
      if (ability) {
        result.executedAbilityName = ability.name;
        result.executedAbilityEffect = ability.executeEffect;
        this.executeAbility(ability.executeEffect, forward, result);
      }
    }

    // Buff Timers
    if (this.timeDilationTimer > 0) {
      this.timeDilationTimer -= dt;
      if (this.timeDilationTimer <= 0) {
        this.isTimeDilated = false;
        sound.setTimeDilation(false);
      }
    }
    if (this.overdriveTimer > 0) {
      this.overdriveTimer -= dt;
      if (this.overdriveTimer <= 0) this.isOverdriveActive = false;
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.isInvulnerable = false;
    }

    this.updateStyle(dt);
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 4.5);
    }

    return result;
  }

  private executeAbility(effect: string, forwardDir: THREE.Vector3, result: AbilityExecutionResult): void {
    switch (effect) {
      case 'teleport_forward': {
        result.triggerDecoy = true;
        result.decoyPosition = this.position.clone();
        this.position.addScaledVector(forwardDir, 18);
        sound.playDash();
        break;
      }
      case 'ground_slam': {
        // Use a frame-accurate timer instead of setTimeout so triggerGroundSlam
        // is correctly set on the result when it fires
        if (this.isGrounded) {
          this.velocity.y = 14;
        }
        this.groundSlamPending = true;
        this.groundSlamTimer = 0.25;
        sound.playGravityWell();
        break;
      }
      case 'zero_gravity': {
        this.zeroGTimer = 5.0;
        this.velocity.y = 10;
        sound.playDash();
        break;
      }
      case 'heal_shield': {
        this.shield = Math.min(this.maxShield, this.shield + 60);
        this.health = Math.min(this.maxHealth, this.health + 35);
        sound.playMutationChime();
        break;
      }
      case 'time_dilation': {
        this.isTimeDilated = true;
        this.timeDilationTimer = 4.5;
        sound.setTimeDilation(true);
        break;
      }
      case 'gravity_vortex': {
        result.triggerSingularity = true;
        sound.playGravityWell();
        break;
      }
      case 'siphon_swarm': {
        result.triggerSwarm = true;
        sound.playMutationChime();
        break;
      }
      case 'reflect_shockwave': {
        result.triggerRepulsor = true;
        sound.playParryDing();
        break;
      }
      case 'event_horizon': {
        result.triggerSingularity = true;
        this.isTimeDilated = true;
        this.timeDilationTimer = 5.0;
        sound.setTimeDilation(true);
        sound.playGravityWell();
        break;
      }
      case 'rewind_time': {
        if (this.history.length > 0) {
          // Find the entry closest to 3 seconds ago
          const targetTime = performance.now() - 3000;
          let best = this.history[0];
          let bestDiff = Math.abs(this.history[0].time - targetTime);
          for (const entry of this.history) {
            const diff = Math.abs(entry.time - targetTime);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = entry;
            }
          }
          this.position.copy(best.pos);
          this.health = Math.max(this.health, best.health);
          this.velocity.set(0, 0, 0);
          sound.playParryDing();
        }
        break;
      }
      case 'overdrive_buff': {
        this.isOverdriveActive = true;
        this.overdriveTimer = 5.5;
        sound.playMutationChime();
        break;
      }
      case 'dimensional_slash': {
        result.triggerDimensionalSlash = true;
        sound.playKatanaSwing();
        break;
      }
      case 'anomaly_singularity': {
        result.triggerSingularity = true;
        sound.playAnomalyWarning();
        break;
      }
      case 'kinetic_burst': {
        this.velocity.addScaledVector(forwardDir, 26);
        sound.playDash();
        break;
      }
      case 'invuln_dodge': {
        this.isInvulnerable = true;
        this.invulnerableTimer = 1.6;
        this.shield = Math.min(this.maxShield, this.shield + 30);
        sound.playDash();
        break;
      }
      default: {
        sound.playGravityWell();
        break;
      }
    }
  }

  public takeDamage(amount: number): void {
    if (this.isDead || this.isInvulnerable) return;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }

    if (amount > 0) {
      this.health = Math.max(0, this.health - amount);
      if (this.health <= 0) {
        this.isDead = true;
      }
    }
  }

  public addStylePoints(pts: number): void {
    this.stylePoints += pts;
    this.styleDecayTimer = 3.0;
    if (this.stylePoints >= 4500) this.styleRank = 'ULTRAKILL';
    else if (this.stylePoints >= 3000) this.styleRank = 'SUPREME';
    else if (this.stylePoints >= 1800) this.styleRank = 'ANOMALOUS';
    else if (this.stylePoints >= 1000) this.styleRank = 'BRUTAL';
    else if (this.stylePoints >= 400) this.styleRank = 'CARNAGE';
    else this.styleRank = 'FRESH';
  }

  private updateStyle(dt: number): void {
    if (this.styleDecayTimer > 0) {
      this.styleDecayTimer -= dt;
    } else if (this.stylePoints > 0) {
      this.stylePoints = Math.max(0, this.stylePoints - dt * 250);
      if (this.stylePoints < 400) this.styleRank = 'FRESH';
      else if (this.stylePoints < 1000) this.styleRank = 'CARNAGE';
      else if (this.stylePoints < 1800) this.styleRank = 'BRUTAL';
      else if (this.stylePoints < 3000) this.styleRank = 'ANOMALOUS';
      else if (this.stylePoints < 4500) this.styleRank = 'SUPREME';
    }
  }
}
