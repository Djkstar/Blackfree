/**
 * Blackfree: Anomaly Protocol - Projectile & Physical Trail Engine
 * Manages player/enemy projectiles, parry reflections, bullet trails,
 * and solid light construct ramps created by Vector origins.
 */

import * as THREE from 'three';
import { sound } from './audio.ts';

export interface Projectile {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  isPlayerOwned: boolean;
  isParried: boolean;
  life: number;
  maxLife: number;
  color: number;
  radius: number;
}

export class ProjectileManager {
  public group: THREE.Group;
  public projectiles: Projectile[] = [];
  public solidTrailsGroup: THREE.Group;
  private projectileGeo: THREE.SphereGeometry;
  private solidConstructs: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.solidTrailsGroup = new THREE.Group();
    this.group.add(this.solidTrailsGroup);

    this.projectileGeo = new THREE.SphereGeometry(0.2, 8, 8);
  }

  public spawnProjectile(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    isPlayerOwned: boolean,
    colorHex: number = 0xef4444
  ): Projectile {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(this.projectileGeo, mat);
    mesh.position.copy(origin);
    this.group.add(mesh);

    // Glowing core trail
    const proj: Projectile = {
      id: `p_${Date.now()}_${Math.random()}`,
      mesh,
      position: origin.clone(),
      velocity: direction.clone().normalize().multiplyScalar(speed),
      damage,
      isPlayerOwned,
      isParried: false,
      life: 0,
      maxLife: 4.0,
      color: colorHex,
      radius: 0.35,
    };

    this.projectiles.push(proj);
    return proj;
  }

  public update(dt: number, timeDilationFactor: number = 1.0): void {
    // Tick solid light constructs
    for (let i = this.solidConstructs.length - 1; i >= 0; i--) {
      const c = this.solidConstructs[i];
      c.life += dt;
      (c.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.85 * (1 - c.life / c.maxLife));
      if (c.life >= c.maxLife) {
        this.solidTrailsGroup.remove(c.mesh);
        c.mesh.geometry.dispose();
        (c.mesh.material as THREE.Material).dispose();
        this.solidConstructs.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Time dilation applies to enemy projectiles!
      const effectiveDt = p.isPlayerOwned ? dt : dt * timeDilationFactor;
      p.life += dt;

      p.position.addScaledVector(p.velocity, effectiveDt);
      p.mesh.position.copy(p.position);

      if (p.life >= p.maxLife) {
        this.destroyProjectile(i);
      }
    }
  }

  /**
   * Parry check: Called when player swings Katana.
   * If any enemy projectile is within melee radius (4.5m) and in front, reflect it back!
   */
  public checkParry(playerPos: THREE.Vector3, lookDir: THREE.Vector3): Projectile | null {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.isPlayerOwned || p.isParried) continue;

      const dist = p.position.distanceTo(playerPos);
      if (dist < 4.8) {
        const toProj = p.position.clone().sub(playerPos).normalize();
        const dot = lookDir.dot(toProj);

        if (dot > 0.4) {
          // Successful ULTRAKILL Parry!
          p.isPlayerOwned = true;
          p.isParried = true;
          p.damage *= 2.5;
          p.color = 0x38bdf8;
          (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
          p.velocity.copy(lookDir).multiplyScalar(65); // 65 m/s hyper velocity

          sound.playParryDing();
          return p;
        }
      }
    }
    return null;
  }

  /**
   * Vector Origin: Pull physical bullet trails into solid light barriers/ramps
   */
  public solidifyNearbyTrails(center: THREE.Vector3, radius: number = 14): void {
    const nearby = this.projectiles.filter((p) => p.position.distanceTo(center) < radius);
    if (nearby.length < 2) return;

    // Build solid light bridge mesh
    const curvePoints = nearby.map((p) => p.position.clone());
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.45, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    this.solidTrailsGroup.add(tube);
    this.solidConstructs.push({ mesh: tube, life: 0, maxLife: 8.0 });
  }

  public destroyProjectile(index: number): void {
    const p = this.projectiles[index];
    if (!p) return;
    this.group.remove(p.mesh);
    (p.mesh.material as THREE.Material).dispose();
    this.projectiles.splice(index, 1);
  }

  public clear(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.destroyProjectile(i);
    }
  }
}
