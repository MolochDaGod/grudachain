'use strict';

/**
 * ws-server.js — Grudge Studio Dedicated WebSocket Server
 *
 * Standalone real-time communication hub for the Grudge Studio ecosystem.
 * Handles game events, crew/guild chat, PvP match channels, global chat,
 * service notifications, and private user channels.
 *
 * Environment variables:
 *   PORT              — HTTP/WS listen port (default: 3000)
 *   REDIS_URL         — Redis connection string for pub/sub + message history
 *   GRUDA_LEGION_URL  — gruda-legion base URL for JWT auth verification
 *   SESSION_SECRET    — JWT signing secret (shared with gruda-legion)
 *   NODE_ENV          — production | development
 *
 * Rooms:
 *   game:<id>         — game-specific channels
 *   crew:<id>         — crew/guild channels
 *   pvp:<id>          — PvP match channels
 *   global            — global chat
 *   notifications     — service notifications
 *   user:<grudgeId>   — private user channels
 *
 * Events (client → server):
 *   authenticate      — { token } — verify JWT and upgrade connection
 *   join-room         — { room }  — subscribe to a room
 *   leave-room        — { room }  — unsubscribe from a room
 *   message           — { room, text, [meta] } — send message to room
 *   presence          — { status } — update user presence status
 *   game-event        — { room, type, payload } — game-specific event
 *   service-notification — { type, payload } — service status update
 *
 * Events (server → client):
 *   authenticated     — { grudgeId, username, role }
 *   auth-error        — { error }
 *   room-joined       — { room }
 *   room-left         — { room }
 *   message           — { room, from, text, timestamp, [meta] }
 *   presence-update   — { grudgeId, status, room }
 *   game-event        — { room, type, payload, from, timestamp }
 *   service-notification — { type, payload, timestamp }
 *   history           — { room, messages[] }
 *   error             — { error }
 *
 * Deployment:
 *   node ws-server.js
 *   — or as a separate Railway service pointing to this file.
 *
 * Note: gruda-legion (server.js) also exposes Socket.IO on its own domain.
 * This file is the dedicated, horizontally-scalable WebSocket service
 * intended to run at wss://ws.grudge-studio.com/.
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

let jwt;
try { jwt = require('jsonwebtoken'); } catch { jwt = null; }

const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

// ── Configuration ─────────────────────────────────────────────────────────────

const PORT            = process.env.PORT            || 3000;
const NODE_ENV        = process.env.NODE_ENV        || 'development';
const REDIS_URL       = process.env.REDIS_URL       || null;
const GRUDA_LEGION_URL = process.env.GRUDA_LEGION_URL || 'https://api.grudge-studio.com';
const SESSION_SECRET  = process.env.SESSION_SECRET  || 'grudge-warlords-secret-key';

// Maximum messages stored per room in Redis history
const HISTORY_MAX     = 50;
// Redis key TTL for message history (24 hours)
const HISTORY_TTL_SEC = 86400;
// Rate limit: max events per window per socket
const RATE_LIMIT_MAX    = 30;
const RATE_LIMIT_WINDOW = 1000; // ms

// ── CORS Allowlist ────────────────────────────────────────────────────────────

const CORS_ORIGINS = [
  'https://grudgewarlords.com',
  'https://www.grudgewarlords.com',
  'https://grudge-studio.com',
  'https://grudgestudio.com',
  'https://client.grudge-studio.com',
  'https://dash.grudge-studio.com',
  'https://id.grudge-studio.com',
  'https://api.grudge-studio.com',
  'https://account.grudge-studio.com',
  'https://warlord-crafting-suite.vercel.app',
  'https://gdevelop-assistant.vercel.app',
  'https://grudachain-rho.vercel.app',
  'https://grudachain.grudgestudio.com',
  'https://gruda-wars.vercel.app',
  'https://grudge-engine-web.vercel.app',
  'https://starwaygruda-webclient-as2n.vercel.app',
  'https://grim-armada-web.vercel.app',
  'https://grudge-angeler.vercel.app',
  'https://grudge-rts.vercel.app',
  'https://grudge-space-rts.vercel.app',
  'https://grudge-studio-dash.vercel.app',
  'https://nexus-nemesis-game.vercel.app',
  'https://grudge-pvp-server.vercel.app',
  'https://grudge-origins.vercel.app',
  'https://the-engine-grudgenexus.vercel.app',
  'https://grudge-platform.vercel.app',
  'https://grudgeplatform.com',
  'https://www.grudgeplatform.com',
  'https://grudgeplatform.io',
  'https://www.grudgeplatform.io',
  'https://dungeon-crawler-quest.vercel.app',
  'https://molochdagod.github.io',
  'https://app.puter.com',
];
const CORS_PATTERNS = [
  /\.vercel\.app$/,
  /\.grudgestudio\.com$/,
  /\.grudge-studio\.com$/,
  /\.railway\.internal$/,
  /\.up\.railway\.app$/,
  /localhost/,
];

function corsOriginCheck(origin, callback) {
  if (!origin) return callback(null, true); // non-browser clients
  if (CORS_ORIGINS.includes(origin)) return callback(null, true);
  if (CORS_PATTERNS.some(p => p.test(origin))) return callback(null, true);
  callback(new Error(`CORS: origin not allowed — ${origin}`));
}

// ── Express + HTTP server ─────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const httpServer = createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,       // 1 MB
  perMessageDeflate: { threshold: 1024 },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30 * 1000,
    skipMiddlewares: false,
  },
});

// ── Redis clients ─────────────────────────────────────────────────────────────

let _redisMain  = null; // general-purpose (history, presence)
let _redisPub   = null; // Socket.IO adapter pub
let _redisSub   = null; // Socket.IO adapter sub
let _redisReady = false;

const _redisStatus = { status: 'unconfigured', error: null };

async function initRedis() {
  if (!REDIS_URL) {
    console.warn('⚠️  REDIS_URL not set — running without Redis (no pub/sub, no history)');
    _redisStatus.status = 'unconfigured';
    return;
  }

  _redisStatus.status = 'connecting';
  console.log('🔴 Connecting to Redis...');

  const makeClient = () => createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis reconnect limit reached');
        return Math.min(retries * 200, 3000);
      }
    }
  });

  _redisMain = makeClient();
  _redisPub  = makeClient();
  _redisSub  = makeClient();

  _redisMain.on('error', (err) => {
    if (_redisStatus.status !== 'error') console.error('❌ Redis error:', err.message);
    _redisStatus.status = 'error';
    _redisStatus.error  = err.message;
    _redisReady = false;
  });
  _redisMain.on('ready', () => {
    _redisStatus.status = 'ready';
    _redisStatus.error  = null;
    _redisReady = true;
  });

  try {
    await Promise.all([
      _redisMain.connect(),
      _redisPub.connect(),
      _redisSub.connect(),
    ]);
    await _redisMain.ping();
    _redisReady = true;
    _redisStatus.status = 'ready';
    _redisStatus.error  = null;
    console.log('✅ Redis connected');

    // Attach Socket.IO Redis adapter for horizontal scaling
    io.adapter(createAdapter(_redisPub, _redisSub));
    console.log('✅ Socket.IO Redis adapter attached');
  } catch (err) {
    _redisStatus.status = 'error';
    _redisStatus.error  = err.message;
    console.error('❌ Redis connection failed:', err.message);
    // Server continues without Redis
  }
}

// ── Presence tracking (in-memory, augmented by Redis when available) ──────────

// Map<grudgeId, { socketId, status, rooms: Set<string>, connectedAt }>
const _presence = new Map();

function setPresence(grudgeId, socketId, status = 'online') {
  const existing = _presence.get(grudgeId) || { rooms: new Set(), connectedAt: Date.now() };
  _presence.set(grudgeId, { ...existing, socketId, status });
}

function removePresence(grudgeId) {
  _presence.delete(grudgeId);
}

function getPresence(grudgeId) {
  return _presence.get(grudgeId) || null;
}

// ── Message history (Redis-backed, in-memory fallback) ────────────────────────

// In-memory fallback: Map<room, Array<message>>
const _historyCache = new Map();

async function pushHistory(room, message) {
  const key = `ws:history:${room}`;
  if (_redisReady && _redisMain) {
    try {
      await _redisMain.lPush(key, JSON.stringify(message));
      await _redisMain.lTrim(key, 0, HISTORY_MAX - 1);
      await _redisMain.expire(key, HISTORY_TTL_SEC);
      return;
    } catch (err) {
      console.warn('⚠️  Redis history push failed:', err.message);
    }
  }
  // In-memory fallback
  const list = _historyCache.get(room) || [];
  list.unshift(message);
  if (list.length > HISTORY_MAX) list.length = HISTORY_MAX;
  _historyCache.set(room, list);
}

async function getHistory(room) {
  const key = `ws:history:${room}`;
  if (_redisReady && _redisMain) {
    try {
      const raw = await _redisMain.lRange(key, 0, HISTORY_MAX - 1);
      return raw.map(r => JSON.parse(r)).reverse();
    } catch (err) {
      console.warn('⚠️  Redis history fetch failed:', err.message);
    }
  }
  return (_historyCache.get(room) || []).slice().reverse();
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

const _socketRates = new Map();

function socketRateLimit(socket, next) {
  const now   = Date.now();
  const entry = _socketRates.get(socket.id) || { count: 0, reset: now + RATE_LIMIT_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_LIMIT_WINDOW; }
  entry.count++;
  _socketRates.set(socket.id, entry);
  if (entry.count > RATE_LIMIT_MAX) return next(new Error('Rate limit exceeded'));
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of _socketRates) {
    if (now > entry.reset + 10000) _socketRates.delete(id);
  }
}, 30000);

// ── JWT / Auth helpers ────────────────────────────────────────────────────────

/**
 * Verify a JWT token. Returns a user object on success, null on failure.
 * Fast path: local jwt.verify(). Slow path: remote gruda-legion /api/auth/verify.
 */
async function verifyToken(token) {
  // Fast path — local decode
  if (jwt) {
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      if (decoded.grudgeId) {
        return {
          grudgeId: decoded.grudgeId,
          username: decoded.username || decoded.grudgeId,
          userId:   decoded.userId   || decoded.grudgeId,
          role:     decoded.role     || 'player',
        };
      }
    } catch { /* fall through */ }
  }

  // Slow path — remote verification via gruda-legion
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await _fetch(`${GRUDA_LEGION_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.grudgeId) {
        return {
          grudgeId: data.grudgeId,
          username: data.username || data.user?.username || data.grudgeId,
          userId:   data.user?.id || data.grudgeId,
          role:     data.user?.role || 'player',
        };
      }
    }
  } catch { /* auth service unreachable */ }

  return null;
}

// ── Room validation ───────────────────────────────────────────────────────────

const VALID_ROOM_PREFIXES = ['game:', 'crew:', 'pvp:', 'user:'];
const VALID_STATIC_ROOMS  = new Set(['global', 'notifications']);

function isValidRoom(room) {
  if (typeof room !== 'string' || room.length < 1 || room.length > 128) return false;
  if (VALID_STATIC_ROOMS.has(room)) return true;
  return VALID_ROOM_PREFIXES.some(prefix => room.startsWith(prefix));
}

// ── Socket.IO middleware ──────────────────────────────────────────────────────

// Initial connection middleware — allow guests, tag them
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.data.grudgeUser = { grudgeId: `guest-${socket.id}`, role: 'guest', isGuest: true };
    return next();
  }
  // Attempt token verification asynchronously
  verifyToken(token).then(user => {
    if (user) {
      socket.data.grudgeUser = { ...user, isGuest: false };
    } else {
      socket.data.grudgeUser = { grudgeId: `guest-${socket.id}`, role: 'guest', isGuest: true };
    }
    next();
  }).catch(() => {
    socket.data.grudgeUser = { grudgeId: `guest-${socket.id}`, role: 'guest', isGuest: true };
    next();
  });
});

io.use(socketRateLimit);

// ── Socket.IO connection handler ──────────────────────────────────────────────

io.on('connection', (socket) => {
  const user = socket.data.grudgeUser;
  console.log(`[ws] connect  ${user.username || user.grudgeId} (${user.role}) — ${socket.id}`);

  // Track presence
  setPresence(user.grudgeId, socket.id, 'online');

  // Auto-join personal room and notifications
  socket.join(`user:${user.grudgeId}`);
  socket.join('notifications');

  // Emit connection acknowledgement
  socket.emit('connected', {
    grudgeId:  user.grudgeId,
    username:  user.username,
    role:      user.role,
    isGuest:   user.isGuest,
    timestamp: Date.now(),
  });

  // ── authenticate ──────────────────────────────────────────────────────────
  // Allows upgrading a guest connection to an authenticated one post-connect.
  socket.on('authenticate', async ({ token } = {}) => {
    if (!token) return socket.emit('auth-error', { error: 'Token required' });

    const verified = await verifyToken(token);
    if (!verified) return socket.emit('auth-error', { error: 'Invalid or expired token' });

    // Leave old guest room, join authenticated user room
    const oldId = user.grudgeId;
    socket.leave(`user:${oldId}`);
    removePresence(oldId);

    socket.data.grudgeUser = { ...verified, isGuest: false };
    const newUser = socket.data.grudgeUser;

    socket.join(`user:${newUser.grudgeId}`);
    setPresence(newUser.grudgeId, socket.id, 'online');

    socket.emit('authenticated', {
      grudgeId:  newUser.grudgeId,
      username:  newUser.username,
      role:      newUser.role,
      timestamp: Date.now(),
    });

    console.log(`[ws] auth     ${newUser.username} (${newUser.role}) — ${socket.id}`);
  });

  // ── join-room ─────────────────────────────────────────────────────────────
  socket.on('join-room', async ({ room } = {}) => {
    if (!isValidRoom(room)) {
      return socket.emit('error', { error: `Invalid room: ${room}` });
    }

    // Private user rooms require authentication
    if (room.startsWith('user:') && room !== `user:${user.grudgeId}`) {
      if (user.isGuest || user.role === 'guest') {
        return socket.emit('error', { error: 'Authentication required to join private rooms' });
      }
    }

    socket.join(room);
    socket.emit('room-joined', { room, timestamp: Date.now() });

    // Send recent history for the room
    const history = await getHistory(room);
    if (history.length > 0) {
      socket.emit('history', { room, messages: history });
    }

    // Broadcast presence to room
    io.to(room).emit('presence-update', {
      grudgeId:  user.grudgeId,
      username:  user.username,
      status:    'joined',
      room,
      timestamp: Date.now(),
    });

    console.log(`[ws] join     ${user.username || user.grudgeId} → ${room}`);
  });

  // ── leave-room ────────────────────────────────────────────────────────────
  socket.on('leave-room', ({ room } = {}) => {
    if (!isValidRoom(room)) return;
    // Prevent leaving auto-joined rooms
    if (room === `user:${user.grudgeId}` || room === 'notifications') return;

    socket.leave(room);
    socket.emit('room-left', { room, timestamp: Date.now() });

    io.to(room).emit('presence-update', {
      grudgeId:  user.grudgeId,
      username:  user.username,
      status:    'left',
      room,
      timestamp: Date.now(),
    });

    console.log(`[ws] leave    ${user.username || user.grudgeId} ← ${room}`);
  });

  // ── message ───────────────────────────────────────────────────────────────
  socket.on('message', async ({ room, text, meta } = {}) => {
    if (!isValidRoom(room)) {
      return socket.emit('error', { error: `Invalid room: ${room}` });
    }
    if (typeof text !== 'string' || text.trim().length === 0) {
      return socket.emit('error', { error: 'Message text is required' });
    }

    const msg = {
      room,
      from:      user.grudgeId,
      username:  user.username || user.grudgeId,
      text:      text.slice(0, 1000),
      meta:      meta || null,
      timestamp: Date.now(),
    };

    // Persist to history
    await pushHistory(room, msg);

    // Broadcast to all room members
    io.to(room).emit('message', msg);
  });

  // ── presence ──────────────────────────────────────────────────────────────
  socket.on('presence', ({ status } = {}) => {
    const allowed = ['online', 'away', 'busy', 'offline'];
    if (!allowed.includes(status)) {
      return socket.emit('error', { error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    setPresence(user.grudgeId, socket.id, status);

    // Broadcast to all rooms this socket is in
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    for (const room of rooms) {
      io.to(room).emit('presence-update', {
        grudgeId:  user.grudgeId,
        username:  user.username,
        status,
        room,
        timestamp: Date.now(),
      });
    }
  });

  // ── game-event ────────────────────────────────────────────────────────────
  socket.on('game-event', async ({ room, type, payload } = {}) => {
    if (!room || !room.startsWith('game:') && !room.startsWith('pvp:')) {
      return socket.emit('error', { error: 'game-event requires a game: or pvp: room' });
    }
    if (!isValidRoom(room)) {
      return socket.emit('error', { error: `Invalid room: ${room}` });
    }
    if (typeof type !== 'string' || type.length === 0) {
      return socket.emit('error', { error: 'game-event type is required' });
    }

    const event = {
      room,
      type:      type.slice(0, 64),
      payload:   payload || null,
      from:      user.grudgeId,
      username:  user.username || user.grudgeId,
      timestamp: Date.now(),
    };

    // Persist game events to history
    await pushHistory(room, { ...event, eventKind: 'game-event' });

    io.to(room).emit('game-event', event);
  });

  // ── service-notification ──────────────────────────────────────────────────
  // Only admin/master roles may broadcast service notifications
  socket.on('service-notification', ({ type, payload } = {}) => {
    if (user.role !== 'admin' && user.role !== 'master') {
      return socket.emit('error', { error: 'Admin role required for service notifications' });
    }
    if (typeof type !== 'string' || type.length === 0) {
      return socket.emit('error', { error: 'service-notification type is required' });
    }

    const notification = {
      type:      type.slice(0, 64),
      payload:   payload || null,
      from:      user.grudgeId,
      timestamp: Date.now(),
    };

    // Broadcast to the notifications room (all connected clients)
    io.to('notifications').emit('service-notification', notification);
    console.log(`[ws] svc-notif ${type} from ${user.username || user.grudgeId}`);
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const currentUser = socket.data.grudgeUser;
    console.log(`[ws] disconnect ${currentUser.username || currentUser.grudgeId} (${reason})`);

    removePresence(currentUser.grudgeId);
    _socketRates.delete(socket.id);

    // Notify rooms this socket was in
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    for (const room of rooms) {
      io.to(room).emit('presence-update', {
        grudgeId:  currentUser.grudgeId,
        username:  currentUser.username,
        status:    'offline',
        room,
        timestamp: Date.now(),
      });
    }
  });
});

// ── HTTP endpoints ────────────────────────────────────────────────────────────

const SERVER_START_TIME = Date.now();

/**
 * GET /health
 * Standard health check — used by Railway healthcheck and load balancers.
 */
app.get('/health', (req, res) => {
  const uptimeMs = Date.now() - SERVER_START_TIME;
  res.json({
    status:      'healthy',
    service:     'gruda-ws-server',
    version:     '1.0.0',
    uptime:      uptimeMs,
    uptimeHuman: formatUptime(uptimeMs),
    connections: io.engine.clientsCount || 0,
    presence:    _presence.size,
    redis:       _redisStatus,
    nodeEnv:     NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

/**
 * GET /api/ws/info
 * Returns WebSocket server capabilities and room structure.
 */
app.get('/api/ws/info', (req, res) => {
  res.json({
    success: true,
    service: 'gruda-ws-server',
    version: '1.0.0',
    connections: io.engine.clientsCount || 0,
    rooms: {
      prefixes: VALID_ROOM_PREFIXES,
      static:   [...VALID_STATIC_ROOMS],
    },
    events: {
      clientToServer: [
        'authenticate', 'join-room', 'leave-room',
        'message', 'presence', 'game-event', 'service-notification',
      ],
      serverToClient: [
        'connected', 'authenticated', 'auth-error',
        'room-joined', 'room-left',
        'message', 'history',
        'presence-update',
        'game-event', 'service-notification',
        'error',
      ],
    },
    redis: _redisStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/ws/presence
 * Returns current online presence map (grudgeId → status).
 */
app.get('/api/ws/presence', (req, res) => {
  const online = {};
  for (const [grudgeId, data] of _presence) {
    online[grudgeId] = { status: data.status, connectedAt: data.connectedAt };
  }
  res.json({
    success:   true,
    count:     _presence.size,
    presence:  online,
    timestamp: new Date().toISOString(),
  });
});

// ── Utility ───────────────────────────────────────────────────────────────────

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// ── Startup ───────────────────────────────────────────────────────────────────

(async () => {
  console.log('🔧 Initializing Grudge Studio WebSocket Server...');

  await initRedis();

  httpServer.listen(PORT, () => {
    console.log(`
██╗    ██╗███████╗    ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗
██║    ██║██╔════╝    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
██║ █╗ ██║███████╗    ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
██║███╗██║╚════██║    ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
╚███╔███╔╝███████║    ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
 ╚══╝╚══╝ ╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
`);
    console.log('🚀 Grudge Studio WebSocket Server started');
    console.log(`📡 Listening on ws://localhost:${PORT}`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log(`🔴 Redis: ${_redisStatus.status}`);
    console.log(`
🎯 Endpoints:
• Health Check:  http://localhost:${PORT}/health
• WS Info:       http://localhost:${PORT}/api/ws/info
• Presence:      http://localhost:${PORT}/api/ws/presence
• WebSocket:     ws://localhost:${PORT}

🏠 Supported Rooms:
• game:<id>      — game-specific channels
• crew:<id>      — crew/guild channels
• pvp:<id>       — PvP match channels
• global         — global chat
• notifications  — service notifications
• user:<id>      — private user channels

✅ Grudge Studio WebSocket Server is fully operational!
`);
  });
})().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received — shutting down WebSocket server...`);

  // Notify all connected clients
  io.emit('service-notification', {
    type:      'server-shutdown',
    payload:   { message: 'Server is shutting down. Please reconnect shortly.' },
    timestamp: Date.now(),
  });

  httpServer.close(async () => {
    const tasks = [];
    if (_redisMain && _redisMain.isOpen) tasks.push(_redisMain.quit().catch(() => {}));
    if (_redisPub  && _redisPub.isOpen)  tasks.push(_redisPub.quit().catch(() => {}));
    if (_redisSub  && _redisSub.isOpen)  tasks.push(_redisSub.quit().catch(() => {}));
    await Promise.all(tasks);
    console.log('✅ WebSocket server closed gracefully');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

module.exports = { io, httpServer, app };
