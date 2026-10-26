/**
 * Blackfree: Anomaly Protocol - System Instability & The Random Force
 * Implements Pillar 3: Background instability accumulation, spatial tears,
 * gravitational collapses, and rogue-like system wipe events.
 */

import * as THREE from 'three';
import { sound } from './audio.ts';

export interface SpatialTear {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  radius: number;
}

export class InstabilityDirector {
  public instability: number = 0; // 0 to 100
  public group: THREE.Group;
  public tears: SpatialTear[] = [];
  public isCataclysmActive: boolean = false;
  public cataclysmTimer: number = 0;
  private tearGeo: THREE.TorusGeometry;
  private warningSoundTimer: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.tearGeo = new THREE.TorusGeometry(3.5, 0.4, 12, 32);
  }

  public reset(): void {
    this.instability = 0;
    this.isCataclysmActive = false;
    this.cataclysmTimer = 0;
    this.clearTears();
  }

  public addInstability(amount: number): void {
    this.instability = Math.min(100, this.instability + amount);
  }

  public update(dt: number): { triggerApexSpawn: boolean; triggerSystemWipe: boolean } {
    let triggerApexSpawn = false;
    let triggerSystemWipe = false;

    // Natural background entropy accumulation
    this.instability = Math.min(100, this.instability + dt * 0.85);

    // Periodic warning siren when instability is critical (> 75%)
    if (this.instability > 75) {
      this.warningSoundTimer -= dt;
      if (this.warningSoundTimer <= 0) {
        sound.playAnomalyWarning();
        this.warningSoundTimer = 6.0;
      }
    }

    // High instability triggers random spatial tears
    if (this.instability > 50 && Math.random() < dt * 0.15 && this.tears.length < 3) {
      this.spawnSpatialTear(
        new THREE.Vector3(
          (Math.random() - 0.5) * 60,
          25 + Math.random() * 15,
          (Math.random() - 0.5) * 60
        )
      );
      triggerApexSpawn = true;
    }

    // Update active spatial tears
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const tear = this.tears[i];
      tear.life += dt;
      tear.mesh.rotation.z += dt * 3.5;
      tear.mesh.rotation.x += dt * 2.0;

      // Pulse size
      const scale = 1 + Math.sin(tear.life * 6) * 0.2;
      tear.mesh.scale.set(scale, scale, scale);

      if (tear.life >= tear.maxLife) {
        this.destroyTear(i);
      }
    }

    // Cataclysm Wipe: When instability reaches 100%, a sudden Spatial Collapse begins
    if (this.instability >= 100) {
      if (!this.isCataclysmActive) {
        this.isCataclysmActive = true;
        this.cataclysmTimer = 10.0; // 10 seconds of high-intensity survival before annihilation
        sound.playAnomalyWarning();
      }

      this.cataclysmTimer -= dt;
      if (this.cataclysmTimer <= 0) {
        // The Random Force strikes: Sudden Elimination Reset!
        triggerSystemWipe = true;
      }
    }

    return { triggerApexSpawn, triggerSystemWipe };
  }

  public spawnSpatialTear(position: THREE.Vector3): SpatialTear {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(this.tearGeo, mat);
    mesh.position.copy(position);
    this.group.add(mesh);

    const tear: SpatialTear = {
      mesh,
      position,
      life: 0,
      maxLife: 15.0,
      radius: 3.5,
    };

    this.tears.push(tear);
    return tear;
  }

  private destroyTear(index: number): void {
    const tear = this.tears[index];
    if (!tear) return;
    this.group.remove(tear.mesh);
    (tear.mesh.material as THREE.Material).dispose();
    this.tears.splice(index, 1);
  }

  private clearTears(): void {
    for (let i = this.tears.length - 1; i >= 0; i--) {
      this.destroyTear(i);
    }
  }
}
