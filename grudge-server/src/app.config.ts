import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

import { LobbyRoom } from "./rooms/LobbyRoom";
import { IslandRoom } from "./rooms/IslandRoom";

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define("lobby", LobbyRoom);
    gameServer.define("island", IslandRoom);
  },

  initializeExpress: (app) => {
    // Health check
    app.get("/health", (_req, res) => {
      res.json({
        status: "healthy",
        app: "grudge-lobbies",
        rooms: ["lobby", "island"],
        authGateway: process.env.AUTH_GATEWAY_URL || "https://auth-gateway-flax.vercel.app",
        timestamp: new Date().toISOString(),
      });
    });

    // Colyseus Monitor (dev only)
    if (process.env.NODE_ENV !== "production") {
      app.use("/colyseus", monitor());
    }

    // Colyseus Playground (dev only)
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground);
    }
  },

  beforeListen: () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   Grudge Lobbies — Colyseus Server        ║
║   Rooms: lobby, island                    ║
║   Auth: auth-gateway-flax.vercel.app      ║
╚═══════════════════════════════════════════╝
    `);
  },
});
