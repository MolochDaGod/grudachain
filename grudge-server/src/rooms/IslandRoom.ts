import { Room, Client } from "@colyseus/core";
import { IslandState, PlayerState } from "../schemas/PlayerState";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://id.grudge-studio.com";

interface JoinOptions {
  token?: string;
  username?: string;
  islandId?: string;
  characterClass?: string;
  race?: string;
  faction?: string;
}

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

export class IslandRoom extends Room<IslandState> {
  maxClients = 50;

  onCreate(options: any) {
    const state = new IslandState();
    state.islandId = options.islandId || "starter-island";
    state.islandName = options.islandName || "Starter Island";
    state.biome = options.biome || "temperate";
    this.setState(state);

    console.log(`[IslandRoom] created: ${state.islandName} (${this.roomId})`);

    // Simulation tick â€” 20 fps for position sync
    this.setSimulationInterval(() => this.tick(), 1000 / 20);

    // Day/night cycle â€” advance 1 hour every 5 real minutes
    this.clock.setInterval(() => {
      state.timeOfDay = (state.timeOfDay + 1) % 24;
    }, 5 * 60 * 1000);
  }

  async onAuth(client: Client, options: JoinOptions) {
    if (options.token) {
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
      username: options.username || `Guest-${client.sessionId.slice(0, 4)}`,
      role: "guest",
    };
  }

  onJoin(client: Client, options: JoinOptions, auth: any) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.grudgeId = auth.grudgeId;
    player.username = auth.username;
    player.role = auth.role;
    player.characterClass = options.characterClass || "";
    player.race = options.race || "";
    player.faction = options.faction || "";
    player.joinedAt = Date.now();
    // Spawn at island origin
    player.position.x = Math.random() * 10 - 5;
    player.position.z = Math.random() * 10 - 5;

    this.state.players.set(client.sessionId, player);
    console.log(`[IslandRoom] ${auth.username} joined ${this.state.islandName}`);

    this.broadcast("player-joined", {
      sessionId: client.sessionId,
      username: auth.username,
    }, { except: client });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("player-left", {
        sessionId: client.sessionId,
        username: player.username,
      }, { except: client });
      this.state.players.delete(client.sessionId);
      console.log(`[IslandRoom] ${player.username} left ${this.state.islandName}`);
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

      case "chat":
        this.broadcast("chat", {
          sessionId: client.sessionId,
          username: player.username,
          message: String(message.text || "").slice(0, 500),
          timestamp: Date.now(),
        });
        break;

      case "action":
        // Future: combat, harvesting, interact
        this.broadcast("player-action", {
          sessionId: client.sessionId,
          username: player.username,
          action: message.action,
          target: message.target,
        }, { except: client });
        break;
    }
  }

  tick() {
    // Future: NPC AI, faction events, resource respawns
  }

  onDispose() {
    console.log(`[IslandRoom] disposed: ${this.state.islandName}`);
  }
}
