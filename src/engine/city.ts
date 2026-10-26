/**
 * Blackfree: Anomaly Protocol - Sector-07 AAA Cyberpunk City Engine (Blackfree 2.0 Visual Overhaul)
 * Includes procedural high-resolution skyscraper window grids, 3D holographic billboards,
 * rooftop steam exhaust vents, animated cyber-traffic, and precision parkour colliders.
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

interface FlyingVehicle {
  mesh: THREE.Group;
  speed: number;
  radius: number;
  angle: number;
  altitude: number;
  clockwise: boolean;
}

interface SteamPuff {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

export class CityManager {
  public group: THREE.Group;
  public platforms: CityPlatform[] = [];
  public jumpPads: CityPlatform[] = [];
  public wallRunSurfaces: CityPlatform[] = [];
  public lootCrates: LootCrate[] = [];
  public crateMeshes: Map<string, THREE.Group> = new Map();

  // Visual Overhaul Elements
  private flyingVehicles: FlyingVehicle[] = [];
  private steamVents: THREE.Vector3[] = [];
  private steamPuffs: SteamPuff[] = [];
  private steamGroup: THREE.Group;
  private steamSpawnTimer: number = 0;
  public neonFixtures: {
    worldPos: THREE.Vector3;
    material: THREE.MeshBasicMaterial;
    baseColor: THREE.Color;
    baseOpacity: number;
    flickerTimer: number;
  }[] = [];

  // Cached Textures
  private cyanTowerTexture: THREE.CanvasTexture;
  private amberTowerTexture: THREE.CanvasTexture;
  private purpleTowerTexture: THREE.CanvasTexture;
  private roofTexture: THREE.CanvasTexture;
  private wallRunTexture: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();
    this.steamGroup = new THREE.Group();
    this.group.add(this.steamGroup);

    // Generate Procedural Textures
    this.cyanTowerTexture = this.createCyberFacadeTexture('#06b6d4', '#e0f2fe', '#0c4a6e');
    this.amberTowerTexture = this.createCyberFacadeTexture('#f59e0b', '#fef3c7', '#78350f');
    this.purpleTowerTexture = this.createCyberFacadeTexture('#c084fc', '#f3e8ff', '#581c87');
    this.roofTexture = this.createRooftopTexture();
    this.wallRunTexture = this.createWallRunTexture();

    this.generateSector07();
    this.spawnInitialLootCrates();
    this.setupCyberTraffic();
  }

  /**
   * Generates a 512x512 procedural cyberpunk skyscraper facade texture
   * with lit windows, dark obsidian panels, and structural seams.
   */
  private createCyberFacadeTexture(glowColor: string, litWindowColor: string, dimColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark titanium background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 512, 512);

    // Structural columns
    ctx.fillStyle = '#0f172a';
    for (let c = 0; c < 512; c += 64) {
      ctx.fillRect(c, 0, 10, 512);
    }

    // Horizontal floor plates
    for (let r = 0; r < 512; r += 32) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, r, 512, 6);
    }

    // Window Grid
    const cols = 8;
    const rows = 16;
    const colWidth = 512 / cols;
    const rowHeight = 512 / rows;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const rnd = Math.random();
        const wx = i * colWidth + 14;
        const wy = j * rowHeight + 8;
        const ww = colWidth - 26;
        const wh = rowHeight - 14;

        if (rnd > 0.65) {
          // Fully illuminated office window
          ctx.fillStyle = litWindowColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.shadowBlur = 0;
        } else if (rnd > 0.45) {
          // Dim / evening lighting
          ctx.fillStyle = dimColor;
          ctx.fillRect(wx, wy, ww, wh);
        } else {
          // Dark reflective glass
          ctx.fillStyle = '#030712';
          ctx.fillRect(wx, wy, ww, wh);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Generates a concrete/asphalt rooftop texture with grip panels and hazard markings
   */
  private createRooftopTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    // Concrete grid tiles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Subtle grip texture speckles
    ctx.fillStyle = '#334155';
    for (let s = 0; s < 300; s++) {
      const rx = Math.random() * 256;
      const ry = Math.random() * 256;
      ctx.fillRect(rx, ry, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  /**
   * Generates glowing chevron wall-run guidance panels
   */
  private createWallRunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 256, 128);

    // Glowing Chevrons
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 10;

    for (let c = 20; c < 256; c += 55) {
      ctx.beginPath();
      ctx.moveTo(c, 24);
      ctx.lineTo(c + 24, 64);
      ctx.lineTo(c, 104);
      ctx.lineTo(c + 12, 104);
      ctx.lineTo(c + 36, 64);
      ctx.lineTo(c + 12, 24);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }

  /**
   * Generates procedural holographic neon billboard canvas texture
   */
  private createBillboardTexture(
    header: string,
    sub: string,
    jpText: string,
    primaryColor: string,
    glowColor: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark holographic background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, 512, 256);

    // Cyber border frame
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    // Hazard corner tabs
    ctx.fillStyle = primaryColor;
    ctx.fillRect(8, 8, 30, 8);
    ctx.fillRect(8, 8, 8, 30);
    ctx.fillRect(474, 8, 30, 8);
    ctx.fillRect(496, 8, 8, 30);
    ctx.fillRect(8, 240, 30, 8);
    ctx.fillRect(8, 218, 8, 30);
    ctx.fillRect(474, 240, 30, 8);
    ctx.fillRect(496, 218, 8, 30);

    // Japanese Subtitle
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = glowColor;
    ctx.fillText(jpText, 24, 52);

    // Main English Header
    ctx.font = 'black 36px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillText(header, 24, 110);
    ctx.shadowBlur = 0;

    // Subtext description
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = primaryColor;
    ctx.fillText(sub, 24, 150);

    // Audio/Flux graphic telemetry bars
    for (let b = 0; b < 24; b++) {
      const bh = 10 + Math.sin(b * 0.6) * 25 + Math.random() * 15;
      ctx.fillStyle = b % 2 === 0 ? primaryColor : glowColor;
      ctx.fillRect(24 + b * 19, 230 - bh, 14, bh);
    }

    // Scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 512, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private generateSector07(): void {
    // 1. Central Plaza Rooftop (Main Ground Platform)
    this.createSkyscraper(0, 0, 0, 44, 20, 44, this.cyanTowerTexture, 0x06b6d4, true);

    // 2. North High Tower (Chrono Spire)
    this.createSkyscraper(0, 0, -50, 30, 40, 30, this.cyanTowerTexture, 0x06b6d4, true, 'chrono');

    // 3. South Extraction Spire (Vector Core)
    this.createSkyscraper(0, 0, 50, 32, 34, 32, this.purpleTowerTexture, 0x8b5cf6, true, 'vector');

    // 4. East Tech Block (Syndicate Exchange)
    this.createSkyscraper(48, 0, 0, 34, 28, 32, this.amberTowerTexture, 0xf59e0b, true, 'syndicate');

    // 5. West Comms Array (Axiom Wardens Fortress)
    this.createSkyscraper(-48, 0, 0, 32, 30, 34, this.cyanTowerTexture, 0x3b82f6, true, 'wardens');

    // 6. Corner Satellite Skyscrapers
    this.createSkyscraper(44, 0, 44, 24, 42, 24, this.purpleTowerTexture, 0xec4899);
    this.createSkyscraper(-44, 0, 44, 24, 36, 24, this.cyanTowerTexture, 0x06b6d4);
    this.createSkyscraper(44, 0, -44, 26, 40, 26, this.purpleTowerTexture, 0x8b5cf6);
    this.createSkyscraper(-44, 0, -44, 26, 46, 26, this.amberTowerTexture, 0xf59e0b);

    // 7. Reinforced Sky Catwalks with Neon Edge Strips
    this.createCatwalk(0, 20.2, -27, 6.5, 0.5, 20);
    this.createCatwalk(0, 20.2, 27, 6.5, 0.5, 20);
    this.createCatwalk(26, 20.2, 0, 20, 0.5, 6.5);
    this.createCatwalk(-26, 20.2, 0, 20, 0.5, 6.5);

    // 8. Kinetic Jump Pads with Pulsing Energy Rings
    this.createJumpPad(0, 20.3, 0);
    this.createJumpPad(16, 20.3, 16);
    this.createJumpPad(-16, 20.3, -16);
    this.createJumpPad(0, 34.3, 50);
    this.createJumpPad(0, 40.3, -50);

    // 9. Wall-Run Panels with Directional Chevrons
    this.createWallRunPanel(18, 23.5, -25, 0.4, 7, 16, new THREE.Vector3(-1, 0, 0));
    this.createWallRunPanel(-18, 23.5, 25, 0.4, 7, 16, new THREE.Vector3(1, 0, 0));
    this.createWallRunPanel(25, 23.5, 18, 16, 7, 0.4, new THREE.Vector3(0, 0, -1));
    this.createWallRunPanel(-25, 23.5, -18, 16, 7, 0.4, new THREE.Vector3(0, 0, 1));

    // 10. Rooftop Industrial Props & Steam Vents
    this.createRooftopProps();
  }

  private createSkyscraper(
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    facadeTex: THREE.CanvasTexture,
    neonColor: number,
    hasNeonTrim: boolean = false,
    billboardType?: 'chrono' | 'vector' | 'syndicate' | 'wardens'
  ): void {
    const buildingGroup = new THREE.Group();

    // Multi-material box: Roof uses grip concrete, sides use procedural skyscraper windows
    const sideTexCloned = facadeTex.clone();
    sideTexCloned.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 8)));

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTexCloned,
      roughness: 0.25,
      metalness: 0.75,
      emissive: neonColor,
      emissiveIntensity: 0.15,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      map: this.roofTexture,
      roughness: 0.45,
      metalness: 0.5,
    });

    const materials = [
      sideMat, // right (+x)
      sideMat, // left (-x)
      roofMat, // top (+y)
      roofMat, // bottom (-y)
      sideMat, // front (+z)
      sideMat, // back (-z)
    ];

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(0, h / 2, 0);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    buildingGroup.add(mesh);

    // Glowing Neon Ledge Perimeter
    if (hasNeonTrim) {
      const trimGeo = new THREE.BoxGeometry(w + 0.6, 0.2, d + 0.6);
      const trimMat = new THREE.MeshBasicMaterial({ color: neonColor });
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.position.set(0, h - 0.1, 0);
      buildingGroup.add(trimMesh);

      // Skyscraper Antenna Mast with blinking aviation light
      const mastGeo = new THREE.CylinderGeometry(0.12, 0.35, 12, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(w / 3, h + 6, d / 3);
      buildingGroup.add(mast);

      const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: neonColor });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(w / 3, h + 12, d / 3);
      buildingGroup.add(beacon);
      this.animatedMaterials.push(beaconMat);
    }

    // Attach 3D Holographic Billboard
    if (billboardType) {
      const billboardMesh = this.createHoloBillboard(billboardType, w, h, d);
      buildingGroup.add(billboardMesh);
    }

    buildingGroup.position.set(x, y, z);
    this.group.add(buildingGroup);

    // Register top collision platform
    const topBox = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y + h - 0.2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h + 0.2, z + d / 2)
    );
    this.platforms.push({ box: topBox, mesh });
  }

  private createHoloBillboard(
    type: 'chrono' | 'vector' | 'syndicate' | 'wardens',
    parentW: number,
    parentH: number,
    parentD: number
  ): THREE.Group {
    const bbGroup = new THREE.Group();

    let title = 'CHRONO CORP';
    let sub = 'QUANTUM DILATION MATRIX';
    let jp = '時間制御システム';
    let colorCss = '#06b6d4';
    let glowCss = '#38bdf8';
    let colorHex = 0x06b6d4;

    if (type === 'vector') {
      title = 'VECTOR DYNAMICS';
      sub = 'GRAVITATIONAL FORCE ENG';
      jp = '重力偏向ドライブ';
      colorCss = '#ec4899';
      glowCss = '#f472b6';
      colorHex = 0xec4899;
    } else if (type === 'syndicate') {
      title = 'NEON SYNDICATE';
      sub = 'HIGH-FREQUENCY ROOFTOP';
      jp = 'シンジケート貿易所';
      colorCss = '#f59e0b';
      glowCss = '#fbbf24';
      colorHex = 0xf59e0b;
    } else if (type === 'wardens') {
      title = 'AXIOM WARDENS';
      sub = 'ANOMALY CONTAINMENT SEC-07';
      jp = '時空歪曲隔離プロトコル';
      colorCss = '#3b82f6';
      glowCss = '#60a5fa';
      colorHex = 0x3b82f6;
    }

    const bbTex = this.createBillboardTexture(title, sub, jp, colorCss, glowCss);

    // Billboard Screen Canvas Mesh
    const screenGeo = new THREE.PlaneGeometry(16, 8);
    const screenMat = new THREE.MeshBasicMaterial({
      map: bbTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);

    // Steel Support Trusses
    const frameGeo = new THREE.BoxGeometry(16.4, 8.4, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.25;

    // Glowing Neon Edge Frame
    const edgeGeo = new THREE.BoxGeometry(16.6, 8.6, 0.1);
    const edgeMat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.z = -0.2;

    bbGroup.add(frame);
    bbGroup.add(edge);
    bbGroup.add(screen);

    // Mount location based on building orientation
    if (type === 'chrono') {
      // Facing South into main plaza
      bbGroup.position.set(0, parentH + 5, parentD / 2 - 0.5);
    } else if (type === 'vector') {
      // Facing North into main plaza
      bbGroup.position.set(0, parentH + 5, -parentD / 2 + 0.5);
      bbGroup.rotation.y = Math.PI;
    } else if (type === 'syndicate') {
      // Facing West into main plaza
      bbGroup.position.set(-parentW / 2 + 0.5, parentH + 5, 0);
      bbGroup.rotation.y = -Math.PI / 2;
    } else {
      // Facing East into main plaza
      bbGroup.position.set(parentW / 2 - 0.5, parentH + 5, 0);
      bbGroup.rotation.y = Math.PI / 2;
    }

    return bbGroup;
  }

  private createCatwalk(x: number, y: number, z: number, w: number, h: number, d: number): void {
    const catwalkGroup = new THREE.Group();

    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const mesh = new THREE.Mesh(geo, mat);
    catwalkGroup.add(mesh);

    // Glowing Cyan Guide Strips on catwalk edges
    const isZOriented = d > w;
    if (isZOriented) {
      const stripGeo = new THREE.BoxGeometry(0.15, 0.2, d);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const leftStrip = new THREE.Mesh(stripGeo, stripMat);
      leftStrip.position.set(-w / 2 + 0.1, h / 2 + 0.1, 0);
      const rightStrip = new THREE.Mesh(stripGeo, stripMat);
      rightStrip.position.set(w / 2 - 0.1, h / 2 + 0.1, 0);
      catwalkGroup.add(leftStrip);
      catwalkGroup.add(rightStrip);
    } else {
      const stripGeo = new THREE.BoxGeometry(w, 0.2, 0.15);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const frontStrip = new THREE.Mesh(stripGeo, stripMat);
      frontStrip.position.set(0, h / 2 + 0.1, -d / 2 + 0.1);
      const backStrip = new THREE.Mesh(stripGeo, stripMat);
      backStrip.position.set(0, h / 2 + 0.1, d / 2 - 0.1);
      catwalkGroup.add(frontStrip);
      catwalkGroup.add(backStrip);
    }

    catwalkGroup.position.set(x, y, z);
    this.group.add(catwalkGroup);

    const box = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y - 0.2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + 0.2, z + d / 2)
    );
    this.platforms.push({ box, mesh });
  }

  private createJumpPad(x: number, y: number, z: number): void {
    const geo = new THREE.CylinderGeometry(2.2, 2.5, 0.4, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    // Pulsing Outer Energy Torus Ring
    const ringGeo = new THREE.TorusGeometry(1.7, 0.14, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.25, z);
    this.group.add(ring);

    // Inner Kinetic Accelerator Core
    const coreGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(x, y + 0.25, z);
    this.group.add(core);

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
      map: this.wallRunTexture,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
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
      { x: -10, z: 10, w: 3.5, h: 2.4, d: 4 },
      { x: 12, z: -10, w: 4, h: 2.8, d: 3 },
      { x: -14, z: -10, w: 3, h: 2.2, d: 3 },
      { x: 8, z: 14, w: 3.5, h: 2.4, d: 3.5 },
    ];

    props.forEach(({ x, z, w, h, d }) => {
      const hvacGroup = new THREE.Group();

      // Main HVAC Unit Box
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      hvacGroup.add(mesh);

      // Exhaust Turbine Cylinder on top
      const ventGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.7, 12);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(0, h + 0.35, 0);
      hvacGroup.add(vent);

      // Register as steam emitter position
      this.steamVents.push(new THREE.Vector3(x, 20 + h + 0.7, z));

      hvacGroup.position.set(x, 20, z);
      this.group.add(hvacGroup);

      const box = new THREE.Box3(
        new THREE.Vector3(x - w / 2, 20, z - d / 2),
        new THREE.Vector3(x + w / 2, 20 + h, z + d / 2)
      );
      this.platforms.push({ box, mesh });
    });
  }

  private setupCyberTraffic(): void {
    const vehicleColors = [0x06b6d4, 0x38bdf8, 0xf59e0b, 0xec4899];

    for (let i = 0; i < 8; i++) {
      const vGroup = new THREE.Group();
      const col = vehicleColors[i % vehicleColors.length];

      // Aerodynamic Cruiser Fuselage
      const bodyGeo = new THREE.BoxGeometry(1.6, 0.5, 3.8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.1 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      vGroup.add(body);

      // Cyan / Amber Headlights
      const lightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
      const lightMat = new THREE.MeshBasicMaterial({ color: col });
      const l1 = new THREE.Mesh(lightGeo, lightMat);
      l1.position.set(0.5, 0, 1.9);
      const l2 = new THREE.Mesh(lightGeo, lightMat);
      l2.position.set(-0.5, 0, 1.9);
      vGroup.add(l1);
      vGroup.add(l2);

      // Red Twin Taillights
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const t1 = new THREE.Mesh(lightGeo, tailMat);
      t1.position.set(0.5, 0, -1.9);
      const t2 = new THREE.Mesh(lightGeo, tailMat);
      t2.position.set(-0.5, 0, -1.9);
      vGroup.add(t1);
      vGroup.add(t2);

      this.group.add(vGroup);

      this.flyingVehicles.push({
        mesh: vGroup,
        speed: 0.18 + (i % 3) * 0.07,
        radius: 38 + i * 4.5,
        angle: (i / 8) * Math.PI * 2,
        altitude: 7 + (i % 4) * 3,
        clockwise: i % 2 === 0,
      });
    }
  }

  private spawnInitialLootCrates(): void {
    const spots = [
      { x: 12, y: 20.8, z: -12, shards: 2 },
      { x: -14, y: 20.8, z: 14, shards: 3 },
      { x: 0, y: 40.8, z: -50, shards: 5 }, // North Chrono spire peak
      { x: 0, y: 34.8, z: 50, shards: 4 },  // South Vector spire
      { x: 48, y: 28.8, z: 0, shards: 3 },  // East Syndicate block
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
        emissiveIntensity: 0.6,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      // Skyward Holographic Light Pillar Beacon
      const beamGeo = new THREE.CylinderGeometry(0.1, 0.2, 35, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: sp.shards >= 5 ? 0xf59e0b : 0x38bdf8,
        transparent: true,
        opacity: 0.45,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 17.5;
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
        tier: sp.shards >= 5 ? 'legendary' : sp.shards >= 3 ? 'epic' : 'rare',
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

  public update(dt: number): void {
    // 1. Update Cyber-Traffic Cruiser Orbits
    for (const v of this.flyingVehicles) {
      const dir = v.clockwise ? 1 : -1;
      v.angle += v.speed * dir * dt;
      v.mesh.position.x = Math.cos(v.angle) * v.radius;
      v.mesh.position.z = Math.sin(v.angle) * v.radius;
      v.mesh.position.y = v.altitude;

      // Face forward along trajectory
      v.mesh.rotation.y = -v.angle + (v.clockwise ? -Math.PI / 2 : Math.PI / 2);
    }

    // 2. Rooftop Steam Exhaust Smoke Puffs
    this.steamSpawnTimer -= dt;
    if (this.steamSpawnTimer <= 0) {
      this.steamSpawnTimer = 0.35;
      for (const ventPos of this.steamVents) {
        if (Math.random() < 0.65) {
          const puffGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 6, 6);
          const puffMat = new THREE.MeshBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.35,
          });
          const puffMesh = new THREE.Mesh(puffGeo, puffMat);
          puffMesh.position.copy(ventPos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4));
          this.steamGroup.add(puffMesh);

          this.steamPuffs.push({
            mesh: puffMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.6),
            life: 2.2,
            maxLife: 2.2,
            initialScale: 1.0,
          });
        }
      }
    }

    // Tick and fade steam puffs
    for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
      const p = this.steamPuffs[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.steamGroup.remove(p.mesh);
        this.steamPuffs.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
      const progress = 1 - p.life / p.maxLife;
      const s = 1.0 + progress * 2.2;
      p.mesh.scale.set(s, s, s);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.3;
    }
  }
}
