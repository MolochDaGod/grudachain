import { Room, Client } from "@colyseus/core";
import { LobbyState, PlayerState } from "../schemas/PlayerState";
import { roomAuth, type AuthResult } from "../utils/auth";

interface JoinOptions {
  token?: string;
  username?: string;
  characterClass?: string;
  race?: string;
  faction?: string;
}

export class LobbyRoom extends Room<LobbyState> {
  maxClients = 20;

  onCreate() {
    this.setState(new LobbyState());
    this.setPatchRate(50); // 20hz patch rate
    console.log(`[LobbyRoom] created: ${this.roomId}`);

    this.setSimulationInterval(() => this.tick(), 1000 / 20);
  }

  async onAuth(client: Client, options: JoinOptions): Promise<AuthResult> {
    return roomAuth(client.sessionId, options, "Guest");
  }

  onJoin(client: Client, options: JoinOptions, auth: AuthResult) {
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

    this.broadcast("player-joined", {
      sessionId: client.sessionId,
      username: auth.username,
      role: auth.role,
    }, { except: client });
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Allow 30s reconnection window if disconnect was unintentional
    if (!consented) {
      try {
        await this.allowReconnection(client, 30);
        console.log(`[LobbyRoom] ${player.username} reconnected`);
        return;
      } catch {
        // Reconnection timed out
      }
    }

    this.broadcast("player-left", {
      sessionId: client.sessionId,
      username: player.username,
    }, { except: client });
    this.state.players.delete(client.sessionId);
    console.log(`[LobbyRoom] ${player.username} left`);
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
