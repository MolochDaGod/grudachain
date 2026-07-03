# GrudaChain

Free AI Node System powered by GRUDA Legion v3.0 — the central backend hub for the [Grudge Studio](https://grudgewarlords.com) ecosystem.

## Live Deployments

- **Railway (Backend)**: Deployed on Railway (auto-deploy from `master`)
- **Vercel (Nexus Hub)**: [grudachain.grudgestudio.com](https://grudachain.grudgestudio.com)

> **Note**: `api.grudge-studio.com` is served by [grudge-backend](https://github.com/MolochDaGod/grudge-backend) via Cloudflare Tunnel, not by this Railway instance. GrudaChain provides supplemental services (AI, service registry, accounts, game sessions) and can be reached at its Railway-assigned URL.

---

## Grudge Studio Ecosystem Wiki

### Custom Domains (Cloudflare-managed)

| Domain | Points To | Purpose |
|--------|-----------|----------|
| `grudgewarlords.com` | Vercel (grudge-studio repo) | Main game portal & WCS |
| `www.grudgewarlords.com` | Vercel (grudge-studio repo) | Main game portal (www) |
| `api.grudge-studio.com` | Cloudflare Tunnel → VPS | Grudge Backend (unified game API) |
| `id.grudge-studio.com` | Cloudflare Worker → Railway (The-ENGINE) | Auth gateway / SSO |
| `nexus.grudge-studio.com` | Vercel (grudachain repo) | Nexus hub (unified Grudge ID login) |
| `dash.grudge-studio.com` | Vercel | Admin dashboard |
| `account.grudge-studio.com` | Cloudflare → Backend | Account management |
| `grudachain.grudgestudio.com` | Vercel (grudachain repo) | Nexus hub / app gallery |
| `info.grudge-studio.com` | Vercel | Game data hub (archived → ObjectStore) |

### Core Deployments (All Live ✅)

| App | URL | Platform | Repo |
|-----|-----|----------|------|
| **Grudge Warlords** | [grudgewarlords.com](https://grudgewarlords.com) | Vercel | grudge-studio |
|| **GRUDA Legion** | Railway (auto-deploy) | Railway | grudachain |
| **Auth Gateway** | [id.grudge-studio.com](https://id.grudge-studio.com) | Backend | grudge-studio |
| **Dashboard** | [dash.grudge-studio.com](https://dash.grudge-studio.com) | Vercel | grudge-studio |
| **WCS** | [warlord-crafting-suite.vercel.app](https://warlord-crafting-suite.vercel.app) | Vercel | Warlord-Crafting-Suite |
| **GDevelop Assistant** | [gdevelop-assistant.vercel.app](https://gdevelop-assistant.vercel.app) | Vercel | GDevelopAssistant |
| **ObjectStore** | [molochdagod.github.io/ObjectStore](https://molochdagod.github.io/ObjectStore) | GitHub Pages | ObjectStore |
| **Grudge Platform** | [grudge-platform.vercel.app](https://grudge-platform.vercel.app) | Vercel | grudge-platform |
| **Nexus Hub** | [grudachain.grudgestudio.com](https://grudachain.grudgestudio.com) | Vercel | grudachain |

### Game Deployments (All Live ✅)

| Game | URL | Platform | Status |
|------|-----|----------|--------|
| **Dungeon Crawler Quest** | [dungeon-crawler-quest.vercel.app](https://dungeon-crawler-quest.vercel.app) | Vercel | Live |
| **Grudge Arena** | [grudge-arena.vercel.app](https://grudge-arena.vercel.app) | Vercel | Live |
| **GrudgeSpace RTS** | [grudge-space-rts.vercel.app](https://grudge-space-rts.vercel.app) | Vercel | Live |
| **Grudge Warlords RTS** | [grudge-warlords-rts.vercel.app](https://grudge-warlords-rts.vercel.app) | Vercel | Live |
| **Grudge Engine Web** | [grudge-engine-web.vercel.app](https://grudge-engine-web.vercel.app) | Vercel | Live |
| **Grudge Pipeline** | [grudge-pipeline.vercel.app](https://grudge-pipeline.vercel.app) | Vercel | Live |

### Tools & Data (GitHub Pages)

| Resource | URL |
|----------|-----|
| ObjectStore API | [/ObjectStore](https://molochdagod.github.io/ObjectStore) |
| Item Database | [/ObjectStore/GRUDGE_Item_Database.html](https://molochdagod.github.io/ObjectStore/GRUDGE_Item_Database.html) |
| Sprite Database | [/ObjectStore/SPRITE_DATABASE.html](https://molochdagod.github.io/ObjectStore/SPRITE_DATABASE.html) |
| Item Browser | [/ObjectStore/ItemBrowser.html](https://molochdagod.github.io/ObjectStore/ItemBrowser.html) |
| Grudge Builder | [/Grudge-Builder](https://molochdagod.github.io/Grudge-Builder) |
| Character Builder | [/grudge-character-builder](https://molochdagod.github.io/grudge-character-builder/) |
| Grudge SDK (NPM) | [npmjs.com/package/grudge-studio](https://www.npmjs.com/package/grudge-studio) |

### Auth Flow (canonical)

1. Apps redirect to `https://id.grudge-studio.com/api/auth/page?redirect=<return-url>&app=<name>`
2. User signs in (Puter, OAuth, guest, etc.) on the Grudge ID page
3. Cross-domain return uses `?grudge_token=<jwt>` — apps exchange via `POST id.grudge-studio.com/api/auth/session/exchange`
4. Popup login posts `grudge-auth:success` with a launch token to the opener

Fleet scripts: `grudge-sso.js`, `grudge-game-bootstrap.js`, `grudge-fleet-sdk.js` (see `/api/fleet/connect` manifest).

### Known Issues

- `api.grudge-studio.com` SSL/Tunnel may be offline — game data fallback: `grudge-api-production-0d46.up.railway.app`
- `grudge-character-creator.vercel.app` → 404 (deployment missing)
- `grudge-factions-site.vercel.app` → 404 (deployment missing)
- `grudgeplatform.com` → Squarespace (separate from Vercel grudge-platform)

### Legal

- **Privacy Policy**: [grudgewarlords.com/privacy](https://grudgewarlords.com/privacy) ✅
- **Terms of Service**: [grudgewarlords.com/tos](https://grudgewarlords.com/tos) ✅
- **API endpoint**: `GET /api/legal/links`

---

## GrudaChain Features

- **Vibe AI 8.0.0** — Multi-provider AI with automatic failover (MegaLLM, OpenRouter, AgentRouter, Routeway, Puter.js)
- **Grudge Auth** — JWT auth via id.grudge-studio.com SSO + Discord, Google, GitHub, Phantom, Puter, Phone, Guest
- **Accounts System** — Grudge ID registration, profile management, Puter cloud linking
- **Game Sessions** — Session creation, matchmaking queue, game catalogue
- **Service Registry** — Redis-backed service discovery with 5-min TTL
- **WebSocket** — Real-time chat, game sessions, and admin namespaces via Socket.IO
- **Code Generation** — AI-powered code gen for game development
- **File Analysis** — Automated code quality, security, and performance analysis
- **Rate Limiting** — Per-IP rate limiting on AI and auth endpoints
- **Security** — Helmet, CORS allowlist, trust proxy, permissions policy

## Architecture

```
Clients → Cloudflare → Railway (api.grudge-studio.com)
                          ├─ server.js         Express + Socket.IO hub
                          ├─ api/
                          │   ├─ accounts/     Grudge ID accounts (Postgres)
                          │   ├─ games/        Sessions & matchmaking
                          │   ├─ platform/     Featured content & config
                          │   ├─ gdevelop/     GDevelop Assistant integration
                          │   ├─ vibe/         AI chat providers
                          │   ├─ services/     Service registry (Redis)
                          │   ├─ storage/      Object storage info
                          │   └─ admin/        Stats & ecosystem overview
                          ├─ lib/db.js         Postgres + Redis connections
                          └─ public/           Static frontend (Nexus hub)

Clients → Vercel (grudachain.grudgestudio.com)
           ├─ public/          Nexus hub static site
           └─ api/             Serverless function mirrors
```

## API Endpoints

### Public
- `GET /health` — Health check
- `GET /api/status` — System status
- `GET /api/db/status` — Database connections
- `GET /api/legal/links` — Privacy policy & TOS URLs
- `GET /api/grudge-studio/config` — Ecosystem config
- `GET /api/grudge-studio/links` — All deployment links
- `GET /api/vibe/providers` — Available AI providers
- `GET /api/services/discover` — Registered services
- `GET /api/services/self` — This hub's capabilities
- `GET /api/games/list` — Game catalogue
- `GET /api/games/matchmaking/queue` — Queue depths
- `GET /api/platform/config` — Platform config
- `GET /api/platform/featured` — Featured content
- `GET /api/gdevelop/config` — GDevelop config
- `GET /api/sdk/info` — SDK documentation
- `GET /api/accounts/:grudgeId/public` — Public profile

### Authenticated (Bearer JWT)
- `POST /api/chat` — AI chat (rate-limited: 20/min)
- `POST /api/generate-code` — Code gen (rate-limited: 10/min)
- `POST /api/analyze-file` — File analysis (rate-limited: 10/min)
- `GET /api/accounts/me` — Own profile
- `PUT /api/accounts/me` — Update profile
- `POST /api/accounts/register` — Create account
- `POST /api/accounts/link/puter` — Link Puter ID
- `POST /api/games/session/create` — Start game session
- `POST /api/services/register` — Register a service
- `GET /api/admin/stats` — Server stats
- `GET /api/admin/ecosystem` — Full ecosystem overview

### WebSocket Namespaces
- `/` — Public status + AI chat
- `/game` — Game session events (join/leave/chat)
- `/admin` — Admin-only broadcasts

## Quick Start

```bash
npm install
npm start          # Local dev server on :3000
```

## Deploy

- **Railway**: Push to `master` → Railway auto-deploys `server.js` (Node 20 LTS)
- **Vercel**: Push to `master` → Vercel auto-deploys `public/` + `api/` serverless functions

## Environment Variables

Copy `.env.example` → `.env` — see file for full list including:

```bash
PORT=3000
NODE_ENV=development
SESSION_SECRET=change-me-in-production
AUTH_GATEWAY_URL=https://id.grudge-studio.com
GAME_API_URL=https://api.grudge-studio.com
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
```

## Recent Changes

- **Privacy & TOS** — Added /privacy and /tos pages to grudgewarlords.com and api.grudge-studio.com
- **Server hardening** — Trust proxy, API rate limiting, enhanced Helmet security headers
- **Railway best practices** — Node 20 LTS, sleepApplication false, numReplicas 1
- **Accounts validation** — Username regex (3-20 chars), email format validation
- **Legal API** — `GET /api/legal/links` for frontend privacy/TOS discovery
- **Ecosystem config** — Added legal URLs to /api/grudge-studio/config and /links
- **Expansion routes** — GDevelop, Platform, Games, Accounts routers
- **Service registry** — Redis-backed with in-memory fallback
- **Grudge Login branding** — auth shows Grudge logo; Puter stays backend-only
- **Vibe AI 8.0.0** — Real multi-provider AI chain with automatic failover

---

Created by **Racalvin The Pirate King** — © 2026 [Grudge Studio](https://grudgewarlords.com) | [Privacy](https://grudgewarlords.com/privacy) | [Terms](https://grudgewarlords.com/tos) | [Discord](https://discord.gg/FtGtmxmwkh)
