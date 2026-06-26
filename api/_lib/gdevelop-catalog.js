/** Shared GDevelop launcher catalogue — used by Express router and Vercel handlers */

const { CANONICAL, NEXUS_CANONICAL, NEXUS_ORIGIN, islandHub } = require('./canonical-urls');

const GRUDGE_GAMES = [
  {
    slug: 'grudge-warlords',
    name: 'Grudge Warlords',
    description: 'Open-world MMO with faction combat, crafting, and island exploration.',
    mode: 'mmo',
    url: 'https://client.grudge-studio.com',
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
    url: `${CANONICAL.wcs}/moba`,
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
    url: CANONICAL.platform,
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/platform.png',
    status: 'live',
    tags: ['launcher', 'hub', 'platform']
  },
  {
    slug: 'grudgedot',
    name: 'grudgeDot Launcher',
    description: 'Grudge Studio creator launcher — games, tools, crafting, and AI.',
    mode: 'launcher',
    url: CANONICAL.grudgedot,
    platform: 'vercel',
    thumbnail: 'https://molochdagod.github.io/ObjectStore/images/games/platform.png',
    status: 'live',
    tags: ['launcher', 'gdevelop', 'tools']
  }
];

function getGdevelopConfig() {
  return {
    success: true,
    gdevelop: {
      version: '1.1.0',
      backend: {
        hub: process.env.GRUDA_LEGION_URL || CANONICAL.gameApi,
        auth: process.env.AUTH_GATEWAY_URL || CANONICAL.auth,
        gameApi: process.env.GAME_API_URL || CANONICAL.gameApi,
        platform: process.env.GRUDGE_PLATFORM_URL || CANONICAL.platform,
        objectStore: CANONICAL.objectStore,
        assets: CANONICAL.assets,
        nexus: NEXUS_CANONICAL,
        nexusCanonical: NEXUS_CANONICAL,
        legion: CANONICAL.legion,
        grudaAgent: CANONICAL.grudaAgent
      },
      features: {
        aiAssistant: true,
        assetGallery: true,
        gameLoading: true,
        launchTracking: true,
        multiplayerLobby: true,
        fleetConnect: true,
        characterSync: true,
        islandHub: true
      },
      sdk: {
        name: 'grudge-studio',
        version: '1.2.0',
        npm: 'https://www.npmjs.com/package/grudge-studio'
      },
      urls: {
        assistant: process.env.GDEVELOP_URL || CANONICAL.gdevelop,
        assetGallery: `${CANONICAL.gdevelop}/asset-gallery`,
        dashboard: CANONICAL.dash,
        nexus: NEXUS_CANONICAL,
        nexusCanonical: NEXUS_CANONICAL,
        devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases',
        islandHub: islandHub(),
        characters: `${CANONICAL.warlords}/character`,
        fleetConnect: `${NEXUS_CANONICAL}/grudge-fleet-connect.js`
      },
      playerHub: {
        characters: `${CANONICAL.warlords}/character`,
        island: islandHub(),
        saves: CANONICAL.gameApi,
        account: CANONICAL.auth,
        wcs: `${CANONICAL.wcs}/dashboard`
      }
    },
    timestamp: new Date().toISOString()
  };
}

function filterGames(query) {
  const { status, mode, tag } = query || {};
  let games = GRUDGE_GAMES;
  if (status) games = games.filter(g => g.status === status);
  if (mode) games = games.filter(g => g.mode === mode);
  if (tag) games = games.filter(g => g.tags.includes(tag));
  return games;
}

module.exports = { GRUDGE_GAMES, getGdevelopConfig, filterGames };