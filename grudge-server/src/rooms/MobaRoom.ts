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
 * MobaRoom — Gruda Wars MOBA (5v5, two factions)
 * Max 10 players per match. Faction determined on join.
 */
export class MobaRoom extends Room<LobbyState> {
  maxClients = 10;

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.setMetadata({ mode: "moba", map: options?.map || "gruda-rift" });
    console.log(`[MobaRoom] created: ${this.roomId}`);
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
      username: options?.username || `Hero-${client.sessionId.slice(0, 4)}`,
      role: "guest",
    };
  }

  onJoin(client: Client, options: any, auth: any) {
    const player = new PlayerState();
    player.sessionId  = client.sessionId;
    player.grudgeId   = auth.grudgeId;
    player.username   = auth.username;
    player.role       = auth.role;
    player.characterClass = options?.hero || "warrior";
    player.faction    = options?.faction || (this.state.players.size % 2 === 0 ? "light" : "dark");
    player.joinedAt   = Date.now();
    this.state.players.set(client.sessionId, player);

    console.log(`[MobaRoom] ${auth.username} joined as ${player.characterClass} (${player.faction})`);
    this.broadcast("player-joined", {
      sessionId: client.sessionId,
      username:  auth.username,
      hero:      player.characterClass,
      faction:   player.faction,
    }, { except: client });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("player-left", { sessionId: client.sessionId, username: player.username });
      this.state.players.delete(client.sessionId);
      console.log(`[MobaRoom] ${player.username} left`);
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
      case "ability":
        this.broadcast("ability-used", {
          sessionId: client.sessionId,
          ability: message.ability,
          target: message.target,
        });
        break;
      case "chat":
        this.broadcast("chat", {
          sessionId: client.sessionId,
          username: player.username,
          message: String(message.text || "").slice(0, 500),
          timestamp: Date.now(),
        });
        break;
    }
  }

  tick() {
    // TODO: game state tick — minion spawns, tower state, kill tracking
  }

  onDispose() {
    console.log(`[MobaRoom] disposed: ${this.roomId}`);
  }
}
