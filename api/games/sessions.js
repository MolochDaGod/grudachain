const { Router } = require('express');
const { v4: uuidv4 } = require('crypto').webcrypto
  ? { v4: () => require('crypto').randomUUID() }
  : { v4: () => require('crypto').randomUUID() };

const router = Router();

// ── CORS preflight ──────────────────────────────────────────────
router.options('*', (req, res) => res.status(200).end());

// In-memory matchmaking queues (keyed by game mode)
const _queues = {};

// Full game catalogue (mirrors api/gdevelop/config.js — single import in future)
const GAMES = [
  {
    slug: 'grudge-warlords',
    name: 'Grudge Warlords',
    mode: 'mmo',
    url: 'https://grudgewarlords.com',
    status: 'live',
    maxPlayers: 200,
    colyseus: { room: 'island', serverUrl: process.env.COLYSEUS_SERVER_URL || null }
  },
  {
    slug: 'dungeon-crawler',
    name: 'Dungeon Crawler Quest',
    mode: 'dungeon',
    url: 'https://dungeon-crawler-quest.vercel.app',
    status: 'live',
    maxPlayers: 4,
    colyseus: { room: 'dungeon', serverUrl: process.env.COLYSEUS_SERVER_URL || null }
  },
  {
    slug: 'gruda-wars',
    name: 'Gruda Wars (MOBA)',
    mode: 'moba',
    url: 'https://warlord-crafting-suite.vercel.app/moba',
    status: 'beta',
    maxPlayers: 10,
    colyseus: { room: 'moba', serverUrl: process.env.COLYSEUS_SERVER_URL || null }
  },
  {
    slug: 'grudge-space-rts',
    name: 'GrudgeSpace RTS',
    mode: 'space-rts',
    url: 'https://grudgespacerts.vercel.app',
    status: 'alpha',
    maxPlayers: 8,
    colyseus: { room: 'space-rts', serverUrl: process.env.COLYSEUS_SERVER_URL || null }
  }
];

/**
 * GET /api/games/list
 * Returns the full registered game catalogue with status and server info.
 */
router.get('/list', (req, res) => {
  const { status, mode } = req.query;
  let games = GAMES;
  if (status) games = games.filter(g => g.status === status);
  if (mode)   games = games.filter(g => g.mode === mode);

  res.json({
    success: true,
    games,
    count: games.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/games/session/create
 * Creates a game session record. Requires grudgeId + gameSlug in body.
 * Writes to Postgres if available; falls back to in-memory store.
 */
router.post('/session/create', async (req, res) => {
  const { grudgeId, gameSlug, roomId, metadata = {} } = req.body || {};

  if (!grudgeId || !gameSlug) {
    return res.status(400).json({ error: 'grudgeId and gameSlug are required' });
  }

  const game = GAMES.find(g => g.slug === gameSlug);
  if (!game) {
    return res.status(404).json({ error: `Unknown game slug: ${gameSlug}` });
  }

  const sessionId = require('crypto').randomUUID();
  const session = {
    id: sessionId,
    grudge_id: grudgeId,
    game_slug: gameSlug,
    room_id: roomId || null,
    status: 'active',
    metadata,
    started_at: new Date().toISOString(),
    ended_at: null
  };

  // Postgres write
  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO game_sessions (id, grudge_id, game_slug, room_id, status, metadata, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [session.id, session.grudge_id, session.game_slug, session.room_id,
         session.status, JSON.stringify(session.metadata), session.started_at]
      );
    }
  } catch (err) {
    console.warn('[games/session] DB write skipped:', err.message);
  }

  // Add to matchmaking queue for the game mode
  if (!_queues[gameSlug]) _queues[gameSlug] = [];
  _queues[gameSlug].push({ grudgeId, sessionId, joinedAt: session.started_at });

  console.log(`[games] Session created: ${sessionId} for ${grudgeId} in ${gameSlug}`);

  res.json({
    success: true,
    session,
    game: { name: game.name, url: game.url, colyseus: game.colyseus },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/games/session/:id
 * Retrieves session state by ID.
 */
router.get('/session/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM game_sessions WHERE id = $1',
        [id]
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, session: result.rows[0], timestamp: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.warn('[games/session] DB read skipped:', err.message);
  }

  res.status(404).json({ error: 'Session not found', id });
});

/**
 * DELETE /api/games/session/:id
 * Ends a game session (sets status to ended).
 */
router.delete('/session/:id', async (req, res) => {
  const { id } = req.params;
  const endedAt = new Date().toISOString();

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (pool) {
      const result = await pool.query(
        `UPDATE game_sessions SET status = 'ended', ended_at = $1 WHERE id = $2 RETURNING *`,
        [endedAt, id]
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, session: result.rows[0], timestamp: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.warn('[games/session] DB update skipped:', err.message);
  }

  res.status(404).json({ error: 'Session not found or already ended', id });
});

/**
 * GET /api/games/matchmaking/queue
 * Returns current queue depths per game mode.
 */
router.get('/matchmaking/queue', (req, res) => {
  const queue = {};
  for (const game of GAMES) {
    const q = _queues[game.slug] || [];
    // Prune stale entries older than 5 minutes
    const cutoff = Date.now() - 5 * 60 * 1000;
    const active = q.filter(e => new Date(e.joinedAt).getTime() > cutoff);
    _queues[game.slug] = active;
    queue[game.slug] = {
      mode: game.mode,
      waiting: active.length,
      maxPlayers: game.maxPlayers,
      status: game.status
    };
  }

  res.json({
    success: true,
    queue,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
