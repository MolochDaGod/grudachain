const { Router } = require('express');
const router = Router();

// ── CORS preflight ──────────────────────────────────────────────
router.options('*', (req, res) => res.status(200).end());

// Master game catalogue — single source of truth for GDevelop launcher
const GRUDGE_GAMES = [
  {
    slug: 'grudge-warlords',
    name: 'Grudge Warlords',
    description: 'Open-world MMO with faction combat, crafting, and island exploration.',
    mode: 'mmo',
    url: 'https://grudgewarlords.com',
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/grudge-warlords.png',
    status: 'live',
    tags: ['mmo', 'pvp', 'crafting', 'islands']
  },
  {
    slug: 'dungeon-crawler',
    name: 'Dungeon Crawler Quest',
    description: 'Souls-like dungeon crawling with voxel characters and procedural levels.',
    mode: 'dungeon',
    url: 'https://dungeon-crawler-quest.vercel.app',
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/dungeon-crawler.png',
    status: 'live',
    tags: ['dungeon', 'souls-like', 'voxel', 'pve']
  },
  {
    slug: 'gruda-wars',
    name: 'Gruda Wars (MOBA)',
    description: 'MOBA-style battles with Dota-inspired map design and Grudge faction heroes.',
    mode: 'moba',
    url: 'https://warlord-crafting-suite.vercel.app/moba',
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/gruda-wars.png',
    status: 'beta',
    tags: ['moba', 'pvp', 'heroes', 'lanes']
  },
  {
    slug: 'grudge-space-rts',
    name: 'GrudgeSpace RTS',
    description: 'Space dogfight RTS with fleet battles and BabylonJS rendering.',
    mode: 'space-rts',
    url: 'https://grudgespacerts.vercel.app',
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/space-rts.png',
    status: 'alpha',
    tags: ['rts', 'space', 'fleet', 'babylon']
  },
  {
    slug: 'grudge-platform',
    name: 'Grudge Platform',
    description: 'Central hub launcher for all Grudge Studio games and services.',
    mode: 'launcher',
    url: 'https://grudge-platform.vercel.app',
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/platform.png',
    status: 'live',
    tags: ['launcher', 'hub', 'platform']
  }
];

/**
 * GET /api/gdevelop/config
 * Returns GDevelop launcher configuration — backend URLs, feature flags, SDK info.
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    gdevelop: {
      version: '1.0.0',
      backend: {
        hub:      process.env.GRUDA_LEGION_URL || 'https://api.grudge-studio.com',
        auth:     process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com',
        gameApi:  process.env.GAME_API_URL     || 'https://api.grudge-studio.com',
        platform: process.env.GRUDGE_PLATFORM_URL || 'https://grudge-platform.vercel.app',
        objectStore: 'https://molochdagod.github.io/ObjectStore'
      },
      features: {
        aiAssistant: true,
        assetGallery: true,
        gameLoading: true,
        launchTracking: true,
        multiplayerLobby: true
      },
      sdk: {
        name: 'grudge-studio',
        version: '1.2.0',
        npm: 'https://www.npmjs.com/package/grudge-studio'
      },
      urls: {
        assistant: process.env.GDEVELOP_URL || 'https://gdevelop-assistant.vercel.app',
        assetGallery: 'https://gdevelop-assistant.vercel.app/asset-gallery',
        dashboard: 'https://dash.grudge-studio.com'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/gdevelop/games
 * Returns all registered Grudge games for the GDevelop launcher.
 */
router.get('/games', (req, res) => {
  const { status, mode, tag } = req.query;
  let games = GRUDGE_GAMES;

  if (status) games = games.filter(g => g.status === status);
  if (mode)   games = games.filter(g => g.mode === mode);
  if (tag)    games = games.filter(g => g.tags.includes(tag));

  res.json({
    success: true,
    games,
    count: games.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/gdevelop/launch
 * Records a game launch event. Body: { grudgeId, gameSlug, source? }
 * Writes to Postgres if available, falls back to in-memory log.
 */
router.post('/launch', async (req, res) => {
  const { grudgeId, gameSlug, source = 'gdevelop' } = req.body || {};

  if (!gameSlug) {
    return res.status(400).json({ error: 'gameSlug is required' });
  }

  const game = GRUDGE_GAMES.find(g => g.slug === gameSlug);
  if (!game) {
    return res.status(404).json({ error: `Unknown game slug: ${gameSlug}` });
  }

  const event = {
    grudge_id: grudgeId || null,
    game_slug: gameSlug,
    source,
    launched_at: new Date().toISOString()
  };

  // Attempt Postgres write
  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO launch_events (grudge_id, game_slug, source, launched_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [event.grudge_id, event.game_slug, event.source, event.launched_at]
      );
    }
  } catch (err) {
    // Non-fatal — DB might not have the table yet
    console.warn('[gdevelop/launch] DB write skipped:', err.message);
  }

  console.log(`[gdevelop] Launch: ${gameSlug} by ${grudgeId || 'guest'} via ${source}`);

  res.json({
    success: true,
    event,
    game: { name: game.name, url: game.url },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
