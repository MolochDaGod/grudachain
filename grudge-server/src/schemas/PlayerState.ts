import { Schema, type, MapSchema } from "@colyseus/schema";

export class Vector3 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") grudgeId: string = "";
  @type("string") username: string = "";
  @type("string") role: string = "player";       // player | admin | guest
  @type("string") characterClass: string = "";    // Warrior | Mage | Ranger | Worge
  @type("string") race: string = "";
  @type("string") faction: string = "";
  @type("number") level: number = 1;
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type(Vector3) position: Vector3 = new Vector3();
  @type("number") rotation: number = 0;
  @type("boolean") isReady: boolean = false;
  @type("number") joinedAt: number = 0;
}

export class LobbyState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") phase: string = "waiting";    // waiting | countdown | active
  @type("number") countdown: number = 0;
  @type("number") maxPlayers: number = 20;
}

export class IslandState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") islandId: string = "";
  @type("string") islandName: string = "";
  @type("string") biome: string = "temperate";
  @type("number") timeOfDay: number = 12;       // 0-24 hour cycle
  @type("string") weather: string = "clear";
}
