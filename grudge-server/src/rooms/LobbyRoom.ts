import { Room, Client } from "@colyseus/core";
import { LobbyState, PlayerState } from "../schemas/PlayerState";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://auth-gateway-flax.vercel.app";

interface JoinOptions {
  token?: string;
  username?: string;
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

export class LobbyRoom extends Room<LobbyState> {
  maxClients = 20;

  onCreate() {
    this.setState(new LobbyState());
    console.log(`[LobbyRoom] created: ${this.roomId}`);

    // Tick: broadcast state updates
    this.setSimulationInterval(() => this.tick(), 1000 / 20);
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
    // Allow guest connections with limited permissions
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

    this.state.players.set(client.sessionId, player);
    console.log(`[LobbyRoom] ${auth.username} joined (${auth.role})`);

    // Notify others
    this.broadcast("player-joined", {
      sessionId: client.sessionId,
      username: auth.username,
      role: auth.role,
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
      console.log(`[LobbyRoom] ${player.username} left`);
    }
  }

  onMessage(client: Client, type: string, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (type) {
      case "ready":
        player.isReady = !!message.ready;
        break;

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
    }
  }

  tick() {
    // Future: lobby countdown logic, matchmaking, etc.
  }

  onDispose() {
    console.log(`[LobbyRoom] disposed: ${this.roomId}`);
  }
}
