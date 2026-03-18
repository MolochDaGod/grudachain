# GrudaChain

Free AI Node System powered by GRUDA Legion v3.0 — part of the [Grudge Studio](https://grudge-studio.com) ecosystem.

## Live

- **Web**: [grudachain.grudgestudio.com](https://grudachain.grudgestudio.com)

## Features

- **Vibe AI 8.0.0** — Multi-provider AI with automatic failover (MegaLLM, OpenRouter, AgentRouter, Routeway, Puter.js)
- **Code Generation** — AI-powered code gen for game development
- **File Analysis** — Automated code quality, security, and performance analysis
- **WebSocket** — Real-time AI chat via Socket.io
- **Grudge Auth** — JWT authentication via id.grudge-studio.com SSO
- **Network Discovery** — P2P node discovery for distributed AI workloads

## Architecture

```
Browser → Vercel (static + serverless)
           ├─ public/       Static frontend
           ├─ api/           Serverless functions
           └─ server.js      Express (local dev / Railway)
```

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

## Part of [Grudge Studio](https://grudge-studio.com)

© 2026 Grudge Studio
