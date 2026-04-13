import { Room, Client } from "@colyseus/core";
import { LobbyState, PlayerState } from "../schemas/PlayerState";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://id.grudge-studio.com";

async function verifyToken(token: string): Promise<any | null> {
  try {
    const res = await fetch(`${AUTH_GATEWAY}/api/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}

/**
 * DungeonRoom — Dungeon Crawler Quest (souls-like, up to 4 players)
 * Procedural dungeon instances with permadeath tracking.
 */
export class DungeonRoom extends Room<LobbyState> {
  maxClients = 4;

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.setMetadata({
      mode: "dungeon",
      floor: options?.floor || 1,
      seed: options?.seed || Math.floor(Math.random() * 999999),
      difficulty: options?.difficulty || "normal",
    });
    console.log(`[DungeonRoom] created: ${this.roomId} floor=${options?.floor || 1}`);
    this.setSimulationInterval(() => this.tick(), 1000 / 20);
  }

  async onAuth(client: Client, options: any) {
    if (options?.token) {
      const verified = await verifyToken(options.token);
      if (verified) {
        return {
          grudgeId: verified.grudgeId,
          username: verified.username || verified.user?.username,
          role: verified.user?.role || "player",
        };
      }
    }
    return {
      grudgeId: `guest-${client.sessionId}`,
      username: options?.username || `Adventurer-${client.sessionId.slice(0, 4)}`,
      role: "guest",
    };
  }

  onJoin(client: Client, options: any, auth: any) {
    const player = new PlayerState();
    player.sessionId      = client.sessionId;
    player.grudgeId       = auth.grudgeId;
    player.username       = auth.username;
    player.role           = auth.role;
    player.characterClass = options?.characterClass || "warrior";
    player.race           = options?.race || "human";
    player.faction        = options?.faction || "neutral";
    player.health         = options?.health || 100;
    player.maxHealth      = options?.maxHealth || 100;
    player.joinedAt       = Date.now();
    this.state.players.set(client.sessionId, player);

    console.log(`[DungeonRoom] ${auth.username} entered dungeon ${this.roomId}`);
    this.broadcast("player-joined", {
      sessionId:      client.sessionId,
      username:       auth.username,
      characterClass: player.characterClass,
    }, { except: client });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("player-left", { sessionId: client.sessionId, username: player.username });
      this.state.players.delete(client.sessionId);
      console.log(`[DungeonRoom] ${player.username} left`);
    }
  }

  onMessage(client: Client, type: string, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (type) {
      case "move":
        if (message.x != null) player.position.x = message.x;
        if (message.y != null) player.position.y = message.y;
        if (message.z != null) player.position.z = message.z;
        if (message.rotation != null) player.rotation = message.rotation;
        break;
      case "attack":
        this.broadcast("attack", {
          sessionId:  client.sessionId,
          weaponType: message.weaponType,
          targetId:   message.targetId,
          damage:     message.damage,
        });
        break;
      case "take-damage":
        player.health = Math.max(0, player.health - (message.amount || 0));
        if (player.health <= 0) {
          this.broadcast("player-died", { sessionId: client.sessionId, username: player.username });
        }
        break;
      case "chat":
        this.broadcast("chat", {
          sessionId: client.sessionId,
          username:  player.username,
          message:   String(message.text || "").slice(0, 500),
          timestamp: Date.now(),
        });
        break;
    }
  }

  tick() {
    // TODO: enemy AI tick, trap triggers, loot spawns
  }

  onDispose() {
    console.log(`[DungeonRoom] disposed: ${this.roomId}`);
  }
}
