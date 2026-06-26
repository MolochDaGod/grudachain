const { Router } = require('express');
const { CANONICAL } = require('../_lib/canonical-urls');
const router = Router();

// ── CORS preflight ──────────────────────────────────────────────
router.options('*', (req, res) => res.status(200).end());

// Featured content — will be DB-backed in a future iteration
const FEATURED = [
  {
    id: 'featured-warlords',
    type: 'game',
    slug: 'grudge-warlords',
    title: 'Grudge Warlords',
    subtitle: 'The flagship MMO experience',
    description: 'Build your crew, choose your faction, and conquer the islands.',
    url: 'https://grudgewarlords.com',
    image: 'https://molochdagod.github.io/ObjectStore/images/featured/warlords-banner.png',
    badge: 'LIVE',
    priority: 1
  },
  {
    id: 'featured-dungeon',
    type: 'game',
    slug: 'dungeon-crawler',
    title: 'Dungeon Crawler Quest',
    subtitle: 'Souls-like voxel action',
    description: 'Descend into procedural dungeons with permadeath and faction lore.',
    url: 'https://dungeon-crawler-quest.vercel.app',
    image: 'https://molochdagod.github.io/ObjectStore/images/featured/dungeon-banner.png',
    badge: 'NEW',
    priority: 2
  },
  {
    id: 'featured-moba',
    type: 'game',
    slug: 'gruda-wars',
    title: 'Gruda Wars',
    subtitle: 'MOBA — Factions at War',
    description: 'Pick a Grudge hero and push lanes in this Dota-inspired battleground.',
    url: `${CANONICAL.wcs}/moba`,
    image: 'https://molochdagod.github.io/ObjectStore/images/featured/moba-banner.png',
    badge: 'BETA',
    priority: 3
  },
  {
    id: 'featured-objectstore',
    type: 'resource',
    slug: 'objectstore',
    title: 'Grudge ObjectStore',
    subtitle: 'Item Database & Asset CDN',
    description: 'Browse all Grudge items, weapons, armors, relics, and game assets.',
    url: 'https://molochdagod.github.io/ObjectStore/GRUDGE_Item_Database.html',
    image: 'https://molochdagod.github.io/ObjectStore/images/featured/objectstore-banner.png',
    badge: null,
    priority: 4
  }
];

/**
 * GET /api/platform/config
 * Returns full ecosystem config tailored for apps.grudge-studio.com.
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    platform: {
      name: 'Grudge Platform',
      version: '1.0.0',
      url: process.env.GRUDGE_PLATFORM_URL || CANONICAL.platform,
      backend: {
        hub:         process.env.GRUDA_LEGION_URL || CANONICAL.gameApi,
        auth:        process.env.AUTH_GATEWAY_URL || CANONICAL.auth,
        gameApi:     process.env.GAME_API_URL     || CANONICAL.gameApi,
        objectStore: CANONICAL.objectStore,
        gdevelop:    process.env.GDEVELOP_URL     || CANONICAL.gdevelop,
        dashboard:   CANONICAL.dash,
        wcs:         CANONICAL.wcs,
        nexus:       CANONICAL.nexus
      },
      auth: {
        provider: 'id.grudge-studio.com',
        puter: true,
        discord: true,
        guestAllowed: true
      },
      features: {
        gameLauncher:   true,
        assetBrowser:   true,
        accountSystem:  true,
        matchmaking:    true,
        leaderboards:   false,  // coming soon
        marketplace:    false   // coming soon
      },
      games: {
        endpoint: '/api/gdevelop/games',
        count: 5
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/platform/featured
 * Returns featured games and resources for the platform homepage.
 * Query params: type (game|resource|event), limit (default 10)
 */
router.get('/featured', (req, res) => {
  const { type, limit = 10 } = req.query;
  let items = [...FEATURED].sort((a, b) => a.priority - b.priority);

  if (type) items = items.filter(i => i.type === type);
  items = items.slice(0, parseInt(limit, 10));

  res.json({
    success: true,
    featured: items,
    count: items.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/platform/health
 * Quick health ping for uptime monitoring.
 */
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy', service: 'grudge-platform-api', timestamp: new Date().toISOString() });
});

module.exports = router;
