/**
 * Blackfree: Anomaly Protocol - Tactical Arsenal & Viewmodel System
 * Inspired by ULTRAKILL, VINCIT, COD & CSGO.
 * Complete with procedural 3D viewmodels (Katana, Rifle, Revolver, Shotgun),
 * dynamic recoil sway, muzzle flashes, and frame-accurate parry windows.
 */

import * as THREE from 'three';
import { WeaponDef, WeaponId } from '../types.ts';
import { sound } from './audio.ts';

export const WEAPON_REGISTRY: Record<WeaponId, WeaponDef> = {
  katana: {
    id: 'katana',
    name: 'Monomolecular Blade',
    type: 'melee',
    damage: 85,
    fireRate: 0.35,
    magSize: 0,
    reloadTime: 0,
    recoil: 0.1,
    range: 4.8,
    accentColor: '#06B6D4',
  },
  rifle: {
    id: 'rifle',
    name: 'ACR-9 Cyber Carbine',
    type: 'hitscan',
    damage: 26,
    fireRate: 0.095,
    magSize: 32,
    reloadTime: 1.4,
    recoil: 0.045,
    range: 120,
    accentColor: '#38BDF8',
  },
  revolver: {
    id: 'revolver',
    name: 'Apex Kinetic Hand Cannon',
    type: 'hitscan',
    damage: 110,
    fireRate: 0.52,
    magSize: 6,
    reloadTime: 1.8,
    recoil: 0.16,
    range: 90,
    accentColor: '#F59E0B',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Breach-12 Grav Scatter',
    type: 'hitscan',
    damage: 18, // per pellet x 8 = 144
    fireRate: 0.75,
    magSize: 8,
    reloadTime: 2.1,
    recoil: 0.25,
    range: 35,
    pellets: 8,
    spread: 0.07,
    accentColor: '#8B5CF6',
  },
  smg: {
    id: 'smg',
    name: 'Phantom SMG',
    type: 'hitscan',
    damage: 12,
    fireRate: 0.065,
    magSize: 45,
    reloadTime: 1.1,
    recoil: 0.025,
    range: 65,
    accentColor: '#10b981',
    isAutomatic: true,
  },
  railgun: {
    id: 'railgun',
    name: 'Axiom Rail Cannon',
    type: 'hitscan',
    damage: 210,
    fireRate: 2.2,
    magSize: 1,
    reloadTime: 2.8,
    recoil: 0.5,
    range: 500,
    accentColor: '#a78bfa',
    projectileSpeed: 400,
  },
  throwing_knives: {
    id: 'throwing_knives',
    name: 'Phase Blades',
    type: 'projectile',
    damage: 65,
    fireRate: 0.3,
    magSize: 6,
    reloadTime: 0.9,
    recoil: 0.05,
    range: 60,
    accentColor: '#f43f5e',
  },
};

export class WeaponSystem {
  public currentWeaponId: WeaponId = 'katana';
  public ammo: Record<WeaponId, number> = {
    katana: 0,
    rifle: 32,
    revolver: 6,
    shotgun: 8,
    smg: 45,
    railgun: 1,
    throwing_knives: 6,
  };
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public attackCooldown: number = 0;
  public isAds: boolean = false; // Aim Down Sights (RMB)

  // Viewmodel Three.js objects
  public viewmodelContainer: THREE.Group;
  public weaponMeshes: Map<WeaponId, THREE.Group> = new Map();
  public muzzleFlashLight: THREE.PointLight;

  // Animation & Recoil state
  private recoilOffset = new THREE.Vector3();
  private recoilRot = new THREE.Euler();
  private currentSway = new THREE.Vector2();
  private swingAnimTimer: number = 0;
  private swingAnimDuration: number = 0.25;
  private slashStreakMesh: THREE.Mesh;

  constructor() {
    this.viewmodelContainer = new THREE.Group();

    // Muzzle flash point light
    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 8);
    this.muzzleFlashLight.position.set(0.3, -0.2, -0.9);
    this.viewmodelContainer.add(this.muzzleFlashLight);

    // Procedural Slash Trail for Katana
    const trailGeo = new THREE.RingGeometry(0.8, 1.4, 16, 1, 0, Math.PI * 0.7);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.slashStreakMesh = new THREE.Mesh(trailGeo, trailMat);
    this.slashStreakMesh.position.set(0, -0.1, -1.2);
    this.slashStreakMesh.rotation.set(0.2, 0.4, -0.8);
    this.viewmodelContainer.add(this.slashStreakMesh);

    this.buildProceduralViewmodels();
    this.switchWeapon('katana');
  }

  private buildProceduralViewmodels(): void {
    // 1. KATANA VIEWMODEL (Cyberpunk Monomolecular Katana)
    const katanaGroup = new THREE.Group();
    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.025, 0.06, 1.2);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.45,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0, -0.6);
    katanaGroup.add(blade);

    // Glowing edge strip
    const edgeGeo = new THREE.BoxGeometry(0.005, 0.015, 1.18);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(0, 0.032, -0.6);
    katanaGroup.add(edge);

    // Tsuba (Guard)
    const guardGeo = new THREE.BoxGeometry(0.12, 0.12, 0.03);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, 0, 0.02);
    katanaGroup.add(guard);

    // Tsuka (Handle / Grip)
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.028, 0.32, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, 0.2);
    katanaGroup.add(handle);

    katanaGroup.position.set(0.28, -0.32, -0.45);
    katanaGroup.rotation.set(-0.25, 0.3, -0.2);
    this.viewmodelContainer.add(katanaGroup);
    this.weaponMeshes.set('katana', katanaGroup);

    // 2. ASSAULT CARBINE VIEWMODEL
    const rifleGroup = new THREE.Group();
    // Receiver / Body
    const recGeo = new THREE.BoxGeometry(0.07, 0.12, 0.55);
    const recMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const receiver = new THREE.Mesh(recGeo, recMat);
    rifleGroup.add(receiver);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.42);
    rifleGroup.add(barrel);

    // Holographic Reflex Sight
    const sightGeo = new THREE.BoxGeometry(0.05, 0.06, 0.12);
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.09, -0.05);
    rifleGroup.add(sight);

    // Reticle Dot
    const reticleGeo = new THREE.PlaneGeometry(0.02, 0.02);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.set(0, 0.09, -0.11);
    rifleGroup.add(reticle);

    // Magazine
    const magGeo = new THREE.BoxGeometry(0.05, 0.22, 0.1);
    const magMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.6, roughness: 0.5 });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.14, 0.05);
    mag.rotation.x = 0.2;
    rifleGroup.add(mag);

    rifleGroup.position.set(0.24, -0.24, -0.45);
    this.viewmodelContainer.add(rifleGroup);
    this.weaponMeshes.set('rifle', rifleGroup);

    // 3. HEAVY REVOLVER VIEWMODEL
    const revolverGroup = new THREE.Group();
    // Cylinder
    const cylGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16);
    const cylMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x78350f,
      emissiveIntensity: 0.2,
    });
    const cylinder = new THREE.Mesh(cylGeo, cylMat);
    cylinder.rotation.x = Math.PI / 2;
    revolverGroup.add(cylinder);

    // Heavy Barrel
    const revBarrelGeo = new THREE.BoxGeometry(0.06, 0.08, 0.42);
    const revBarrelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.15 });
    const revBarrel = new THREE.Mesh(revBarrelGeo, revBarrelMat);
    revBarrel.position.set(0, 0.02, -0.28);
    revolverGroup.add(revBarrel);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.05, 0.18, 0.08);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.11, 0.14);
    grip.rotation.x = -0.35;
    revolverGroup.add(grip);

    revolverGroup.position.set(0.22, -0.22, -0.42);
    this.viewmodelContainer.add(revolverGroup);
    this.weaponMeshes.set('revolver', revolverGroup);

    // 4. SCATTER SHOTGUN VIEWMODEL
    const shotgunGroup = new THREE.Group();
    // Twin Heavy Barrels
    const twinBarrelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.48, 12);
    const twinBarrelMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.8, roughness: 0.25 });
    const b1 = new THREE.Mesh(twinBarrelGeo, twinBarrelMat);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(-0.035, 0, -0.3);
    const b2 = new THREE.Mesh(twinBarrelGeo, twinBarrelMat);
    b2.rotation.x = Math.PI / 2;
    b2.position.set(0.035, 0, -0.3);
    shotgunGroup.add(b1, b2);

    // Pump Slide (Fore-end)
    const pumpGeo = new THREE.BoxGeometry(0.12, 0.08, 0.2);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(0, -0.02, -0.22);
    shotgunGroup.add(pump);

    // Receiver & Stock
    const sRecGeo = new THREE.BoxGeometry(0.1, 0.12, 0.35);
    const sRecMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, metalness: 0.7, roughness: 0.3 });
    const sReceiver = new THREE.Mesh(sRecGeo, sRecMat);
    sReceiver.position.set(0, 0, 0.05);
    shotgunGroup.add(sReceiver);

    shotgunGroup.position.set(0.24, -0.26, -0.45);
    this.viewmodelContainer.add(shotgunGroup);
    this.weaponMeshes.set('shotgun', shotgunGroup);

    // 5. PHANTOM SMG VIEWMODEL
    const smgGroup = new THREE.Group();
    const smgRecGeo = new THREE.BoxGeometry(0.055, 0.09, 0.38);
    const smgRecMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.85, roughness: 0.2, emissive: 0x065f46, emissiveIntensity: 0.15 });
    const smgRec = new THREE.Mesh(smgRecGeo, smgRecMat);
    smgGroup.add(smgRec);
    const smgBarrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 10);
    const smgBarrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.15 });
    const smgBarrel = new THREE.Mesh(smgBarrelGeo, smgBarrelMat);
    smgBarrel.rotation.x = Math.PI / 2;
    smgBarrel.position.set(0, 0.02, -0.33);
    smgGroup.add(smgBarrel);
    const smgGripGeo = new THREE.BoxGeometry(0.04, 0.16, 0.06);
    const smgGripMat = new THREE.MeshStandardMaterial({ color: 0x022c22, roughness: 0.85 });
    const smgGrip = new THREE.Mesh(smgGripGeo, smgGripMat);
    smgGrip.position.set(0, -0.12, 0.06);
    smgGrip.rotation.x = -0.3;
    smgGroup.add(smgGrip);
    const smgAccentGeo = new THREE.BoxGeometry(0.058, 0.012, 0.36);
    const smgAccentMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const smgAccent = new THREE.Mesh(smgAccentGeo, smgAccentMat);
    smgAccent.position.set(0, 0.052, 0);
    smgGroup.add(smgAccent);
    smgGroup.position.set(0.22, -0.22, -0.44);
    this.viewmodelContainer.add(smgGroup);
    this.weaponMeshes.set('smg', smgGroup);

    // 6. AXIOM RAIL CANNON VIEWMODEL
    const railGroup = new THREE.Group();
    const railBarrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 14);
    const railBarrelMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.95, roughness: 0.1, emissive: 0x4c1d95, emissiveIntensity: 0.3 });
    const railBarrel = new THREE.Mesh(railBarrelGeo, railBarrelMat);
    railBarrel.rotation.x = Math.PI / 2;
    railBarrel.position.set(0, 0, -0.38);
    railGroup.add(railBarrel);
    const coilMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa });
    for (let ci = 0; ci < 3; ci++) {
      const coilGeo = new THREE.TorusGeometry(0.055, 0.01, 8, 16);
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.rotation.y = Math.PI / 2;
      coil.position.set(0, 0, -0.15 - ci * 0.22);
      railGroup.add(coil);
    }
    const railBodyGeo = new THREE.BoxGeometry(0.1, 0.11, 0.4);
    const railBodyMat = new THREE.MeshStandardMaterial({ color: 0x0f0a1e, metalness: 0.9, roughness: 0.2 });
    const railBody = new THREE.Mesh(railBodyGeo, railBodyMat);
    railBody.position.set(0, 0, 0.06);
    railGroup.add(railBody);
    railGroup.position.set(0.24, -0.24, -0.48);
    this.viewmodelContainer.add(railGroup);
    this.weaponMeshes.set('railgun', railGroup);

    // 7. PHASE BLADES (THROWING KNIVES) VIEWMODEL
    const knivesGroup = new THREE.Group();
    const bladeMat2 = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.05, emissive: 0xf43f5e, emissiveIntensity: 0.35 });
    for (let ki = 0; ki < 3; ki++) {
      const kGeo = new THREE.BoxGeometry(0.01, 0.08, 0.22);
      const k = new THREE.Mesh(kGeo, bladeMat2);
      k.position.set((ki - 1) * 0.04, -0.01 + ki * 0.01, -0.14);
      k.rotation.z = (ki - 1) * 0.2;
      knivesGroup.add(k);
    }
    knivesGroup.position.set(0.20, -0.28, -0.42);
    knivesGroup.rotation.set(-0.1, 0.2, -0.1);
    this.viewmodelContainer.add(knivesGroup);
    this.weaponMeshes.set('throwing_knives', knivesGroup);
  }

  public switchWeapon(id: WeaponId): void {
    if (this.currentWeaponId === id) return;
    this.currentWeaponId = id;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.attackCooldown = 0.18;
    sound.playWeaponSwitch();

    this.weaponMeshes.forEach((mesh, meshId) => {
      mesh.visible = meshId === id;
    });
  }

  public canAttack(): boolean {
    if (this.attackCooldown > 0 || this.isReloading) return false;
    const def = WEAPON_REGISTRY[this.currentWeaponId];
    if (def.type === 'melee') return true;
    return this.ammo[this.currentWeaponId] > 0;
  }

  public triggerAttack(damageMultiplier: number = 1.0): { success: boolean; isMelee: boolean; def: WeaponDef } {
    const def = WEAPON_REGISTRY[this.currentWeaponId];
    if (!this.canAttack()) {
      if (def.type !== 'melee' && this.ammo[this.currentWeaponId] <= 0 && !this.isReloading) {
        this.startReload();
      }
      return { success: false, isMelee: false, def };
    }

    this.attackCooldown = def.fireRate;

    if (def.type === 'melee') {
      sound.playKatanaSwing();
      this.swingAnimTimer = this.swingAnimDuration;
      return { success: true, isMelee: true, def: { ...def, damage: def.damage * damageMultiplier } };
    }

    // Firearms
    this.ammo[this.currentWeaponId]--;
    if (this.currentWeaponId === 'rifle' || this.currentWeaponId === 'smg') sound.playRifleShot();
    else if (this.currentWeaponId === 'revolver' || this.currentWeaponId === 'railgun') sound.playRevolverShot();
    else if (this.currentWeaponId === 'shotgun') sound.playShotgunShot();
    else if (this.currentWeaponId === 'throwing_knives') sound.playKatanaSwing();

    // Trigger visual muzzle flash
    this.muzzleFlashLight.intensity = 2.5;
    this.muzzleFlashLight.color.set(def.accentColor);

    // Apply procedural recoil kick
    this.recoilOffset.z += def.recoil;
    this.recoilOffset.y += def.recoil * 0.4;
    this.recoilRot.x += def.recoil * 1.8;

    return { success: true, isMelee: false, def: { ...def, damage: def.damage * damageMultiplier } };
  }

  public startReload(): void {
    const def = WEAPON_REGISTRY[this.currentWeaponId];
    if (def.type === 'melee' || this.isReloading || this.ammo[this.currentWeaponId] >= def.magSize) return;

    this.isReloading = true;
    this.reloadTimer = def.reloadTime;
  }

  public update(dt: number, mouseDeltaX: number, mouseDeltaY: number, isMoving: boolean, moveTime: number): void {
    // Attack cooldown tick
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }

    // Reload tick
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const def = WEAPON_REGISTRY[this.currentWeaponId];
        this.ammo[this.currentWeaponId] = def.magSize;
      }
    }

    // Decay muzzle flash
    if (this.muzzleFlashLight.intensity > 0) {
      this.muzzleFlashLight.intensity = Math.max(0, this.muzzleFlashLight.intensity - dt * 25);
    }

    // Viewmodel Bob & Sway kinematics
    const swaySpeed = 10;
    const targetSwayX = THREE.MathUtils.clamp(-mouseDeltaX * 0.0012, -0.06, 0.06);
    const targetSwayY = THREE.MathUtils.clamp(mouseDeltaY * 0.0012, -0.06, 0.06);

    this.currentSway.x = THREE.MathUtils.damp(this.currentSway.x, targetSwayX, swaySpeed, dt);
    this.currentSway.y = THREE.MathUtils.damp(this.currentSway.y, targetSwayY, swaySpeed, dt);

    // Walking bob
    const bobFactor = isMoving ? 1 : 0.2;
    const bobX = Math.sin(moveTime * 9) * 0.015 * bobFactor;
    const bobY = Math.abs(Math.sin(moveTime * 18)) * 0.018 * bobFactor;

    // Decay recoil spring
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), dt * 14);
    this.recoilRot.x = THREE.MathUtils.damp(this.recoilRot.x, 0, 14, dt);

    // ADS (Aim Down Sights) lerp
    const activeMesh = this.weaponMeshes.get(this.currentWeaponId);
    if (activeMesh) {
      const defaultPos = this.getDefaultPos(this.currentWeaponId);
      const targetPos = this.isAds && this.currentWeaponId !== 'katana'
        ? new THREE.Vector3(0, -0.16, -0.38)
        : defaultPos;

      activeMesh.position.x = THREE.MathUtils.damp(activeMesh.position.x, targetPos.x + this.currentSway.x + bobX, 16, dt);
      activeMesh.position.y = THREE.MathUtils.damp(activeMesh.position.y, targetPos.y + this.currentSway.y + bobY + this.recoilOffset.y, 16, dt);
      activeMesh.position.z = THREE.MathUtils.damp(activeMesh.position.z, targetPos.z + this.recoilOffset.z, 16, dt);

      // Katana slash animation
      if (this.currentWeaponId === 'katana' && this.swingAnimTimer > 0) {
        this.swingAnimTimer -= dt;
        const progress = 1 - this.swingAnimTimer / this.swingAnimDuration;
        const swingAngle = Math.sin(progress * Math.PI) * 1.5;
        activeMesh.rotation.z = -0.2 - swingAngle;
        activeMesh.rotation.y = 0.3 + swingAngle * 0.8;
        activeMesh.position.x += Math.sin(progress * Math.PI) * 0.15;

        // Slash streak opacity
        const streakMat = this.slashStreakMesh.material as THREE.MeshBasicMaterial;
        streakMat.opacity = Math.sin(progress * Math.PI) * 0.85;
      } else if (this.currentWeaponId === 'katana') {
        const streakMat = this.slashStreakMesh.material as THREE.MeshBasicMaterial;
        streakMat.opacity = 0;
        activeMesh.rotation.set(-0.25, 0.3, -0.2);
      } else {
        activeMesh.rotation.x = this.recoilRot.x;
      }
    }
  }

  private getDefaultPos(id: WeaponId): THREE.Vector3 {
    switch (id) {
      case 'katana': return new THREE.Vector3(0.28, -0.32, -0.45);
      case 'rifle': return new THREE.Vector3(0.24, -0.24, -0.45);
      case 'revolver': return new THREE.Vector3(0.22, -0.22, -0.42);
      case 'shotgun': return new THREE.Vector3(0.24, -0.26, -0.45);
      case 'smg': return new THREE.Vector3(0.22, -0.22, -0.44);
      case 'railgun': return new THREE.Vector3(0.24, -0.24, -0.48);
      case 'throwing_knives': return new THREE.Vector3(0.20, -0.28, -0.42);
    }
  }

  /** Is player currently inside the frame-accurate parry window? */
  public isParrying(): boolean {
    return this.currentWeaponId === 'katana' && this.swingAnimTimer > 0.1;
  }
}
