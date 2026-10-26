/**
 * Blackfree: Anomaly Protocol - Sector-07 Procedural City & Loot Beacons (Blackfree 2.0)
 */

import * as THREE from 'three';
import { LootCrate } from '../types.ts';

export interface CityPlatform {
  box: THREE.Box3;
  mesh: THREE.Mesh;
  isJumpPad?: boolean;
  isWallRun?: boolean;
  normal?: THREE.Vector3;
}

export class CityManager {
  public group: THREE.Group;
  public platforms: CityPlatform[] = [];
  public jumpPads: CityPlatform[] = [];
  public wallRunSurfaces: CityPlatform[] = [];
  public lootCrates: LootCrate[] = [];
  public crateMeshes: Map<string, THREE.Group> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.generateSector07();
    this.spawnInitialLootCrates();
  }

  private generateSector07(): void {
    // 1. Central Plaza Rooftop (Main Ground Platform)
    this.createBuilding(0, 0, 0, 42, 20, 42, 0x1e293b, 0x334155);

    // 2. North High Tower
    this.createBuilding(0, 0, -48, 28, 36, 28, 0x0f172a, 0x06b6d4, true);

    // 3. South Extraction Spire
    this.createBuilding(0, 0, 48, 30, 30, 30, 0x111827, 0x8b5cf6, true);

    // 4. East Tech Block
    this.createBuilding(46, 0, 0, 32, 26, 30, 0x1e293b, 0xf59e0b, true);

    // 5. West Comms Array
    this.createBuilding(-46, 0, 0, 30, 28, 32, 0x0f172a, 0x38bdf8, true);

    // 6. Corner Satellite Skyscrapers
    this.createBuilding(42, 0, 42, 22, 40, 22, 0x18181b, 0xec4899);
    this.createBuilding(-42, 0, 42, 22, 34, 22, 0x18181b, 0x06b6d4);
    this.createBuilding(42, 0, -42, 24, 38, 24, 0x18181b, 0x8b5cf6);
    this.createBuilding(-42, 0, -42, 24, 44, 24, 0x18181b, 0xf59e0b);

    // 7. Catwalks
    this.createCatwalk(0, 20.2, -26, 6, 0.4, 20);
    this.createCatwalk(0, 20.2, 26, 6, 0.4, 20);
    this.createCatwalk(25, 20.2, 0, 20, 0.4, 6);
    this.createCatwalk(-25, 20.2, 0, 20, 0.4, 6);

    // 8. Kinetic Jump Pads
    this.createJumpPad(0, 20.3, 0);
    this.createJumpPad(16, 20.3, 16);
    this.createJumpPad(-16, 20.3, -16);
    this.createJumpPad(0, 30.3, 48);
    this.createJumpPad(0, 36.3, -48);

    // 9. Wall-Run Billboards
    this.createWallRunPanel(18, 23, -24, 0.4, 6, 16, new THREE.Vector3(-1, 0, 0));
    this.createWallRunPanel(-18, 23, 24, 0.4, 6, 16, new THREE.Vector3(1, 0, 0));
    this.createWallRunPanel(24, 23, 18, 16, 6, 0.4, new THREE.Vector3(0, 0, -1));
    this.createWallRunPanel(-24, 23, -18, 16, 6, 0.4, new THREE.Vector3(0, 0, 1));

    // 10. Rooftop props
    this.createRooftopProps();
  }

  private createBuilding(
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    baseColor: number, trimColor: number,
    hasNeonTrim: boolean = false
  ): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.8, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);

    const topBox = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y + h - 0.2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h + 0.2, z + d / 2)
    );
    this.platforms.push({ box: topBox, mesh });

    if (hasNeonTrim) {
      const neonGeo = new THREE.BoxGeometry(w + 0.6, 0.15, d + 0.6);
      const neonMat = new THREE.MeshBasicMaterial({ color: trimColor });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.position.set(x, y + h - 0.1, z);
      this.group.add(neon);
    }
  }

  private createCatwalk(x: number, y: number, z: number, w: number, h: number, d: number): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    const box = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y - 0.2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + 0.2, z + d / 2)
    );
    this.platforms.push({ box, mesh });
  }

  private createJumpPad(x: number, y: number, z: number): void {
    const geo = new THREE.CylinderGeometry(2.2, 2.4, 0.35, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    const ringGeo = new THREE.TorusGeometry(1.6, 0.12, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.2, z);
    this.group.add(ring);

    const padBox = new THREE.Box3(
      new THREE.Vector3(x - 2.2, y - 0.5, z - 2.2),
      new THREE.Vector3(x + 2.2, y + 0.8, z + 2.2)
    );
    const padPlatform: CityPlatform = { box: padBox, mesh, isJumpPad: true };
    this.platforms.push(padPlatform);
    this.jumpPads.push(padPlatform);
  }

  private createWallRunPanel(
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    normal: THREE.Vector3
  ): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    const box = new THREE.Box3(
      new THREE.Vector3(x - w / 2 - 1, y - h / 2, z - d / 2 - 1),
      new THREE.Vector3(x + w / 2 + 1, y + h / 2, z + d / 2 + 1)
    );
    const wallPlatform: CityPlatform = { box, mesh, isWallRun: true, normal };
    this.platforms.push(wallPlatform);
    this.wallRunSurfaces.push(wallPlatform);
  }

  private createRooftopProps(): void {
    const props = [
      { x: -8, z: 8, w: 3, h: 2.2, d: 4 },
      { x: 10, z: -10, w: 4, h: 2.5, d: 3 },
      { x: -12, z: -8, w: 2.5, h: 2, d: 2.5 },
      { x: 6, z: 12, w: 3.5, h: 2.2, d: 3.5 },
    ];
    props.forEach(({ x, z, w, h, d }) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 20 + h / 2, z);
      this.group.add(mesh);

      const box = new THREE.Box3(
        new THREE.Vector3(x - w / 2, 20, z - d / 2),
        new THREE.Vector3(x + w / 2, 20 + h, z + d / 2)
      );
      this.platforms.push({ box, mesh });
    });
  }

  private spawnInitialLootCrates(): void {
    const spots = [
      { x: 12, y: 20.8, z: -12, shards: 2 },
      { x: -14, y: 20.8, z: 14, shards: 3 },
      { x: 0, y: 36.8, z: -48, shards: 4 }, // North high tower peak
      { x: 0, y: 30.8, z: 48, shards: 3 },  // South spire
      { x: 46, y: 26.8, z: 0, shards: 2 },  // East block
    ];

    spots.forEach((sp, idx) => {
      const crateId = `crate_${idx}`;
      const group = new THREE.Group();

      // Glowing Crate Body
      const bodyGeo = new THREE.BoxGeometry(1.2, 0.9, 1.2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.5,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      // Skyward Light Pillar Beacon
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.15, 24, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 12;
      group.add(beam);

      group.position.set(sp.x, sp.y, sp.z);
      this.group.add(group);
      this.crateMeshes.set(crateId, group);

      this.lootCrates.push({
        id: crateId,
        x: sp.x,
        y: sp.y,
        z: sp.z,
        claimed: false,
        tier: sp.shards >= 4 ? 'legendary' : sp.shards >= 3 ? 'epic' : 'rare',
        shards: sp.shards,
      });
    });
  }

  public claimCrate(crateId: string): number {
    const crate = this.lootCrates.find((c) => c.id === crateId);
    if (!crate || crate.claimed) return 0;

    crate.claimed = true;
    const mesh = this.crateMeshes.get(crateId);
    if (mesh) {
      this.group.remove(mesh);
    }
    return crate.shards;
  }

  public getGroundHeight(pos: THREE.Vector3, radius: number = 0.5): { height: number; platform?: CityPlatform } {
    let highest = -999;
    let hitPlatform: CityPlatform | undefined;

    for (const p of this.platforms) {
      if (
        pos.x + radius >= p.box.min.x &&
        pos.x - radius <= p.box.max.x &&
        pos.z + radius >= p.box.min.z &&
        pos.z - radius <= p.box.max.z
      ) {
        if (p.box.max.y > highest && p.box.max.y <= pos.y + 0.8) {
          highest = p.box.max.y;
          hitPlatform = p;
        }
      }
    }

    return { height: highest, platform: hitPlatform };
  }

  public findNearbyWallRun(pos: THREE.Vector3, threshold: number = 2.0): CityPlatform | null {
    for (const wp of this.wallRunSurfaces) {
      if (
        pos.x >= wp.box.min.x - threshold &&
        pos.x <= wp.box.max.x + threshold &&
        pos.z >= wp.box.min.z - threshold &&
        pos.z <= wp.box.max.z + threshold &&
        pos.y >= wp.box.min.y &&
        pos.y <= wp.box.max.y + 2
      ) {
        return wp;
      }
    }
    return null;
  }
}
