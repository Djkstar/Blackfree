# Blackfree 2.0: Living City Anomaly & Gacha Evolution

A major architectural upgrade transforming Blackfree into a living cyberpunk MMORPG simulation: dual-mode camera turning (arrow keys, mouse drag, and pointer lock), an Anomaly Gacha rolling terminal with 15+ abilities across 5 tiers, an autonomous AI civilization featuring jobs, cyber-pets, social relationships, dynamic speech bubbles, and player-like looting routines, paired with a broadcast-grade UI.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> All three user clarifications have been incorporated into the core architecture:
> 1. **Dual-Mode Turning Engine**: Eliminates browser iframe lockouts by providing active mouse drag-to-look, optional pointer lock, and `Arrow Keys` / `IJKL` turning.
> 2. **Anomaly Gacha Terminal**: High-thrill RNG rolling terminal using earned Evolution Shards to unlock Common, Rare, Epic, Legendary, and Anomalous abilities.
> 3. **Evolving Living AI Civilization**: NPCs possess jobs (Netrunner, Enforcer, Courier, Syndicate Merc), cyber-pets (drones & robotic hounds), dynamic relationship trackers (Ally, Rival, Nemesis), speech bubbles, autonomous looting, and player-level parkour.

* **Camera & Turning Overhaul**: Direct drag-to-look on canvas + arrow key turning fallback so camera rotation works 100% reliably in any browser iframe or mobile/desktop viewport without requiring pointer-lock permissions.
* **Expanded Ability Arsenal (15+ Powers)**: Adds Chrono Phase Blink, Temporal Singularity, Kinetic Rail Slam, Zero-G Float, Tachyon Overdrive, Gravity Anchor, Quantum Reversal, Nanite Swarm, Dimensional Blade, Bullet Forge, and Anomaly Rip.
* **Living Social & Relationship Matrix**: In-game social feed, interactive overhead nameplates, job badges, pet companions, and live faction skirmishes across rooftops.
* **Broadcast-Grade HUD & Gacha Deck**: Sleek holographic radar minimap, active pet & job telemetry, animated Gacha roll podium with rarity visual effects, and dynamic combat log.

---

### 1. Overview & Core Concept

**Blackfree 2.0** elevates the game from a vertical combat slice into an open, living cyberpunk ecosystem. Players and autonomous AI agents coexist in Sector-07:

* **Living AI Society**: NPCs aren't target dummies. They hold occupations (Couriers delivering data packets across catwalks, Mercenaries hunting bounties, Netrunners siphoning terminals), own autonomous cyber-pets (flying reconnaissance drones, quad-pedal combat hounds), chat in real-time, react to player actions, form alliances or vendettas, and independently contest loot crates and rooftop jump pads.
* **The Anomaly Gacha**: Instead of static unlock buttons, players channel their Evolution Shards into the **Quantum Anomaly Gacha**. Pull 1x or 5x packs to discover randomized abilities, passive augmentations, and legendary reality-bending techniques.
* **Universal Controls**: Turning and aiming are instantly responsive via drag-to-aim or arrow keys, guaranteeing zero input deadzones regardless of browser security boundaries.

---

### 2. User Experience & Visual Design

#### 2.1 The Living Rooftop World
* **Ambient NPC Routines**: You will see Netrunners hacking billboards, Couriers sprinting along wall-run panels with delivery packs, and Syndicate Mercenaries patrolling with cyber-hounds.
* **Visual Overhead HUD Elements**: Minimalist cyberpunk overhead tags above NPCs: `[Job Tag] Name · Faction · [Pet: Drone-04]`. Speech bubbles pop up when NPCs spot anomalies, engage in combat, or comment on player parkour stunts.
* **Loot Crates & Supply Beacons**: Glowing anomaly crates drop from skyward tears. Both player and NPCs sprint to claim them for shards and ability rolls.

#### 2.2 The Anomaly Gacha Terminal (`G` / Click)
* **Podium Presentation**: Holographic rolling cylinder displaying item cards with distinct tier illumination:
  * **Common (Slate/Blue)**: Base stat amplifiers, shield capacitors.
  * **Rare (Cyan)**: Blink dashes, kinetic wall anchors.
  * **Epic (Purple)**: Gravity wells, bullet solidifiers, time echoes.
  * **Legendary (Gold)**: Event horizon freezes, temporal rewind, tachyon railguns.
  * **Anomalous (Crimson/Glitch)**: Sentient mutating powers that break physical laws.
* **Quick Roll Dock**: Single Roll (1 Shard) and 5x Multi-Roll (4 Shards) with duplicate shard refunds.

#### 2.3 Broadcast-Grade Cyberpunk UI
* **Top Left**: Clean, unboxed status readouts: Health, Shield, Active Job/Reputation, and Cyber-Pet status.
* **Top Center**: Live City Broadcast Ticker: Real-time event log (e.g., *"Courier_Vex completed rooftop transit"*, *"Merc_Kael initiated duel with Anomaly Hunter"*).
* **Top Right**: System Instability Gauge with flashing collapse threat and Mini-Radar compass showing nearby NPCs, pets, and loot beacons.
* **Bottom Left**: Ability Hotbar with 4 active slotted abilities rolled from the Gacha.
* **Bottom Right**: Tactical Weapon View with ammo counters and quick-swap keys.

---

### 3. Key Product Decisions & Trade-Offs

#### 3.1 Triple-Redundant Camera Input Architecture
* **Decision**: Implement Pointer Lock + Mouse Drag Look + Arrow Keys / IJKL in parallel.
* **Why**: Web browser iframes often restrict `requestPointerLock()` without specific click configurations. Dual-mode mouse drag + arrow keys ensures that every player can aim and turn smoothly with zero frustration.

#### 3.2 Autonomous NPC Behavior Tree with Social Flocking & Pets
* **Decision**: Model NPCs with an autonomous utility AI: Job Behavior (Patrol/Hack/Deliver) -> Threat Assessment -> Combat/Looting -> Social Reaction. Cyber-pets use spring follow-damping and attack assistance.
* **Why**: Delivers the feeling of an authentic MMORPG server filled with active players, satisfying the user's requirement for indistinguishable, living NPC agents.

#### 3.3 Gacha Shard Economy
* **Decision**: Shards drop from enemy kills, surviving instability tears, looting city crates, and completing ambient city bounties.
* **Why**: Creates a satisfying, replayable loop where players continuously roll for rare and anomalous builds.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BLACKFREE 2.0 CORE RUNTIME                            │
│                                                                                 │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌──────────────────┐  │
│  │   INPUT CONTROLLER    │   │      AUDIO ENGINE      │   │   GACHA ENGINE   │  │
│  │ • PointerLock API     │   │ • Procedural Synth     │   │ • 15+ Abilities  │  │
│  │ • Canvas Drag Look    │   │ • Dilation Filters     │   │ • Tiered RNG     │  │
│  │ • Arrow Key Turning   │   │ • Gacha Chimes         │   │ • Hotbar Slots   │  │
│  └──────────┬────────────┘   └───────────┬────────────┘   └────────┬─────────┘  │
│             │                            │                         │            │
│  ┌──────────▼────────────────────────────▼─────────────────────────▼─────────┐  │
│  │                            THREE.JS GAME LOOP                             │  │
│  │  ┌─────────────────────────┐             ┌─────────────────────────────┐  │  │
│  │  │   LIVING NPC SYSTEM     │             │    PLAYER KINEMATICS        │  │  │
│  │  │ • Citizen Jobs & Faction│             │ • First-Person Parkour      │  │  │
│  │  │ • Cyber-Pets (Drones)   │◄──Combat───►│ • Multi-Ability Hotbar      │  │  │
│  │  │ • Social Relationships  │    & Chat   │ • Slide / Wall-Run / Jump   │  │  │
│  │  │ • Player-like Parkour   │             │ • Katana Parry & Guns       │  │  │
│  │  └─────────────────────────┘             └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────┐             ┌─────────────────────────────┐  │  │
│  │  │   SECTOR-07 ARENA       │             │   SYSTEM INSTABILITY        │  │  │
│  │  │ • Rooftops & Bridges    │             │ • Background Escalation     │  │  │
│  │  │ • Loot Crate Spawners   │             │ • Spatial Tears & Hunters   │  │  │
│  │  └─────────────────────────┘             └─────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│  ┌───────────────────────────────────▼───────────────────────────────────────┐  │
│  │                    REACT BROADCAST-GRADE INTERFACE                        │  │
│  │  • World-Matched HUD (Vitals, Style, Ammo, Minimap Radar)                │  │
│  │  • Overhead NPC Nameplates, Job Badges & Speech Bubbles                   │  │
│  │  • Holographic Anomaly Gacha Rolling Modal (1x & 5x Rolls)                │  │
│  │  • Sentient Mutation Graph & Hotbar Customizer                            │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Complete Ability Library (15 Abilities Across 5 Tiers)
1. **Chrono Tachyon Dilation** (Chrono Base - 50% slow-mo)
2. **Graviton Vortex** (Vector Base - gravity well)
3. **Phase Blink** (Rare - instant forward teleport leaving decoy)
4. **Kinetic Rail Slam** (Rare - downward seismic shockwave)
5. **Zero-G Float** (Rare - 4-second low-gravity glide)
6. **Tensor Wall-Anchor** (Rare - cling and slide on any vertical surface)
7. **Nanite Repair Swarm** (Epic - autonomous healing drones)
8. **Solid Light Bullets** (Epic - freeze bullet trails into physical launch bridges)
9. **Chrono Afterimage** (Epic - Katana swings repeat 1s later)
10. **Repulsor Shockwave** (Epic - radial kinetic blast deflecting all projectiles)
11. **Event Horizon** (Legendary - localized gravity well that freezes time completely)
12. **Temporal Reversal** (Legendary - rewind health and position by 3 seconds)
13. **Tachyon Overdrive** (Legendary - 3x firing rate and instant reloads)
14. **Dimensional Blade** (Legendary - Katana slashes pierce across the entire city)
15. **The Anomaly Singularity** (Anomalous - summons a rogue black hole that consumes enemies)

---

### 5. Implementation Phases

1. **Phase 1: Dual-Mode Camera & Turning Engine**:
   * Add active mouse drag-to-look on the canvas element, arrow key (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) smooth turning, and `IJKL` support alongside pointer lock.
   * Add camera sensitivity slider and visual cursor indicator.
2. **Phase 2: Expanded Ability & Gacha Roller Engine**:
   * Implement `/src/engine/abilities.ts` with all 15 abilities, stats, cooldowns, and VFX triggers.
   * Build `/src/engine/gacha.ts` handling tiered drop tables, shard rolls (1x and 5x), and ability inventory.
   * Build `/src/components/GachaModal.tsx` with animated cards, tier colors, and hotbar equip slots.
3. **Phase 3: Living AI Society, Cyber-Pets & Social Simulation**:
   * Upgrade `/src/engine/ai.ts` with Citizen Jobs (Courier, Netrunner, Enforcer, Syndicate Merc), cyber-pets (flying Scout Drones & Cyber-Hounds following agents), relationship matrix (Allies, Rivals, Nemesis), and speech lines.
   * Add loot crate spawners across rooftops that both player and NPCs contest.
4. **Phase 4: Broadcast-Grade UI & Overhead World Elements**:
   * In-world projected 3D/2D nameplates with job icons and speech bubble popups.
   * Radar compass in top-right corner tracking allies, rivals, crates, and spatial tears.
   * Live city broadcast event ticker.
5. **Phase 5: Verification & Polish**:
   * Compile and test all inputs, ensure turning works seamlessly across all modes, verify Gacha rolling and NPC pet follow-kinematics.
