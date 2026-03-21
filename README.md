# GrudaChain

Free AI Node System powered by GRUDA Legion v3.0 — part of the [Grudge Studio](https://grudge-studio.com) ecosystem.

## Live

- **Platform**: [platform.grudge-studio.com](https://platform.grudge-studio.com)
- **App Gallery**: [grudachain-app-gallery.vercel.app](https://grudachain-app-gallery.vercel.app)

## Features

- **Grudge Login** — One-click cloud auth powered by Puter (Grudge-branded; Puter stays backend-only)
- **Grudge Cloud Storage** — Puter.js FS/KV object storage under the `grudge-studio/` namespace
- **Vibe AI 8.0.0** — Multi-provider AI with automatic failover (MegaLLM, OpenRouter, AgentRouter, Routeway, Puter.js)
- **Code Generation** — AI-powered code gen for game development
- **File Analysis** — Automated code quality, security, and performance analysis
- **WebSocket** — Real-time AI chat via Socket.io
- **Grudge Auth** — JWT authentication via id.grudge-studio.com SSO
- **Network Discovery** — P2P node discovery for distributed AI workloads

## Architecture

```
Browser → Vercel (static + serverless)
           ├─ public/         Static frontend
           │   ├─ index.html    Grudge Studio Nexus (app gallery)
           │   ├─ legacy.html   GRUDA Legion AI node + cloud storage
           │   └─ grudge-auth.js  Shared auth module (id.grudge-studio.com)
           ├─ api/             Serverless functions
           └─ server.js        Express (local dev / Railway)
```

## Auth

All auth is handled by **Grudge Auth** (`public/grudge-auth.js`) backed by `id.grudge-studio.com`.
Cloud storage uses **Puter.js** as the underlying mechanism but is presented as "Grudge Login" / "Grudge Cloud" in the UI.

- Puter SDK is **lazy-loaded** — injected only when the user clicks Grudge Login (no cold-load 401 noise)
- Returning users auto-reconnect via `grudge_puter_was_signed_in` localStorage flag
- Puter FS/KV namespace: `grudge-studio/` (buckets: assets, configs, game-data, player-data, exports, backups)

## Backend Connections

- **Auth**: https://id.grudge-studio.com
- **Game API**: https://api.grudge-studio.com
- **ObjectStore**: https://molochdagod.github.io/ObjectStore
- **Dashboard**: https://dash.grudge-studio.com

## Quick Start

```bash
npm install
npm start          # Local dev server on :3000
```

## Deploy

Push to `master` → Vercel auto-deploys `public/` + `api/` serverless functions.

## Environment Variables

Copy `.env.example` → `.env`:

```bash
AUTH_GATEWAY_URL=https://id.grudge-studio.com
MEGALLM_API_KEY=
OPENROUTER_API_KEY=
```

## Recent Changes

- **Grudge Login branding** — auth button shows Grudge logo; all "Puter" UI text replaced with Grudge Studio
- **Lazy Puter SDK** — eliminates `/get-gui-token 401` console error on page load
- **readdir 404 fix** — cloud storage panel handles missing directories gracefully
- **favicon.ico** — removed conflicting vercel.json rewrite; static file now serves directly

## Part of [Grudge Studio](https://grudge-studio.com)

© 2026 Grudge Studio
