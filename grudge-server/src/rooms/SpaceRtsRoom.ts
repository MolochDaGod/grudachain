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
 * SpaceRtsRoom — GrudgeSpace RTS (up to 8 players, fleet battles)
 * BabylonJS-rendered space dogfights with ship loadouts.
 */
export class SpaceRtsRoom extends Room<LobbyState> {
  maxClients = 8;

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.setMetadata({
      mode: "space-rts",
      sector: options?.sector || "nebula-prime",
      gameMode: options?.gameMode || "deathmatch", // deathmatch | conquest | escort
    });
    console.log(`[SpaceRtsRoom] created: ${this.roomId} sector=${options?.sector || "nebula-prime"}`);
    this.setSimulationInterval(() => this.tick(), 1000 / 30); // 30hz for fast-paced space combat
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
      username: options?.username || `Pilot-${client.sessionId.slice(0, 4)}`,
      role: "guest",
    };
  }

  onJoin(client: Client, options: any, auth: any) {
    const player = new PlayerState();
    player.sessionId      = client.sessionId;
    player.grudgeId       = auth.grudgeId;
    player.username       = auth.username;
    player.role           = auth.role;
    player.characterClass = options?.shipClass || "fighter"; // fighter | cruiser | dreadnought
    player.faction        = options?.faction || (this.state.players.size % 2 === 0 ? "empire" : "rebels");
    player.health         = options?.shipHealth || 200;
    player.maxHealth      = options?.shipHealth || 200;
    player.joinedAt       = Date.now();
    this.state.players.set(client.sessionId, player);

    console.log(`[SpaceRtsRoom] ${auth.username} (${player.characterClass}) joined faction: ${player.faction}`);
    this.broadcast("player-joined", {
      sessionId:  client.sessionId,
      username:   auth.username,
      shipClass:  player.characterClass,
      faction:    player.faction,
    }, { except: client });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("ship-destroyed", { sessionId: client.sessionId, username: player.username });
      this.state.players.delete(client.sessionId);
      console.log(`[SpaceRtsRoom] ${player.username} left`);
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
      case "fire":
        this.broadcast("projectile", {
          sessionId: client.sessionId,
          weaponId:  message.weaponId,
          origin:    message.origin,
          direction: message.direction,
        });
        break;
      case "take-damage":
        player.health = Math.max(0, player.health - (message.amount || 0));
        if (player.health <= 0) {
          this.broadcast("ship-destroyed", { sessionId: client.sessionId, username: player.username, killedBy: message.killedBy });
        }
        break;
      case "fleet-command":
        // Broadcast fleet-level RTS commands to all players in same faction
        this.broadcast("fleet-command", {
          sessionId: client.sessionId,
          faction:   player.faction,
          command:   message.command,
          target:    message.target,
        });
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
    // TODO: projectile physics, AI fleet units, sector capture logic
  }

  onDispose() {
    console.log(`[SpaceRtsRoom] disposed: ${this.roomId}`);
  }
}
