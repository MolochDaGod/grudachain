import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// ── Shared Primitives ─────────────────────────────────────────────

export class Vector3 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

// ── Player State (shared across all rooms) ────────────────────────

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") grudgeId: string = "";
  @type("string") username: string = "";
  @type("string") role: string = "player";           // player | admin | guest
  @type("string") characterClass: string = "";        // Warrior | Mage | Ranger | Worge
  @type("string") race: string = "";
  @type("string") faction: string = "";
  @type("number") level: number = 1;
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type("number") mana: number = 100;
  @type("number") maxMana: number = 100;
  @type("number") stamina: number = 100;
  @type("number") maxStamina: number = 100;
  @type(Vector3) position: Vector3 = new Vector3();
  @type("number") rotation: number = 0;
  @type("boolean") isReady: boolean = false;
  @type("boolean") isDead: boolean = false;
  @type("number") kills: number = 0;
  @type("number") deaths: number = 0;
  @type("number") assists: number = 0;
  @type("number") joinedAt: number = 0;
}

// ── Lobby State ───────────────────────────────────────────────────

export class LobbyState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") phase: string = "waiting";          // waiting | countdown | active
  @type("number") countdown: number = 0;
  @type("number") maxPlayers: number = 20;
}

// ── Island State ──────────────────────────────────────────────────

export class IslandState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") islandId: string = "";
  @type("string") islandName: string = "";
  @type("string") biome: string = "temperate";
  @type("number") timeOfDay: number = 12;             // 0-24 hour cycle
  @type("string") weather: string = "clear";
}

// ── MOBA State ────────────────────────────────────────────────────

export class TowerState extends Schema {
  @type("string") towerId: string = "";
  @type("string") faction: string = "";
  @type("string") lane: string = "";                   // top | mid | bot
  @type("number") health: number = 3000;
  @type("number") maxHealth: number = 3000;
  @type("boolean") destroyed: boolean = false;
}

export class MobaState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: TowerState }) towers = new MapSchema<TowerState>();
  @type("string") phase: string = "picking";           // picking | active | ended
  @type("string") map: string = "gruda-rift";
  @type("number") gameTimer: number = 0;               // seconds elapsed
  @type("number") creepWave: number = 0;
  @type("number") lightKills: number = 0;
  @type("number") darkKills: number = 0;
  @type("string") winner: string = "";                 // "" | "light" | "dark"
  @type("number") maxPlayers: number = 10;
}

// ── Dungeon State ─────────────────────────────────────────────────

export class EnemyState extends Schema {
  @type("string") enemyId: string = "";
  @type("string") enemyType: string = "";              // skeleton | spider | boss | etc.
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type(Vector3) position: Vector3 = new Vector3();
  @type("number") rotation: number = 0;
  @type("boolean") isDead: boolean = false;
}

export class LootState extends Schema {
  @type("string") lootId: string = "";
  @type("string") itemType: string = "";
  @type("string") rarity: string = "common";           // common | uncommon | rare | epic | legendary
  @type(Vector3) position: Vector3 = new Vector3();
  @type("boolean") claimed: boolean = false;
}

export class DungeonState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
  @type({ map: LootState }) loot = new MapSchema<LootState>();
  @type("string") phase: string = "exploring";         // exploring | combat | boss | cleared | failed
  @type("number") floor: number = 1;
  @type("number") seed: number = 0;
  @type("string") difficulty: string = "normal";       // easy | normal | hard | nightmare
  @type("number") enemiesRemaining: number = 0;
  @type("number") gameTimer: number = 0;               // seconds elapsed
  @type("number") maxPlayers: number = 4;
}

// ── Space RTS State ───────────────────────────────────────────────

export class ResourceNode extends Schema {
  @type("string") nodeId: string = "";
  @type("string") resourceType: string = "";           // minerals | gas | rare-ore
  @type(Vector3) position: Vector3 = new Vector3();
  @type("number") remaining: number = 1000;
  @type("boolean") depleted: boolean = false;
}

export class SpaceRtsState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: ResourceNode }) resources = new MapSchema<ResourceNode>();
  @type("string") phase: string = "deploy";            // deploy | active | ended
  @type("string") sector: string = "nebula-prime";
  @type("string") gameMode: string = "deathmatch";     // deathmatch | conquest | escort
  @type("number") gameTimer: number = 0;
  @type("number") empireScore: number = 0;
  @type("number") rebelsScore: number = 0;
  @type("string") winner: string = "";
  @type("number") maxPlayers: number = 8;
}
