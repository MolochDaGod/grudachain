/** Shared GDevelop launcher catalogue — used by Express router and Vercel handlers */

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
  },
  {
    slug: 'grudgedot',
    name: 'grudgeDot Launcher',
    description: 'Grudge Studio creator launcher — games, tools, crafting, and AI.',
    mode: 'launcher',
    url: 'https://gdevelop-assistant.vercel.app',
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
        hub: process.env.GRUDA_LEGION_URL || 'https://api.grudge-studio.com',
        auth: process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com',
        gameApi: process.env.GAME_API_URL || 'https://api.grudge-studio.com',
        platform: process.env.GRUDGE_PLATFORM_URL || 'https://grudge-platform.vercel.app',
        objectStore: 'https://objectstore.grudge-studio.com',
        assets: 'https://assets.grudge-studio.com',
        nexus: 'https://grudachain.grudge-studio.com',
        legion: 'https://ai.grudge-studio.com',
        grudaAgent: 'https://grudaagent.vercel.app'
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
        assistant: process.env.GDEVELOP_URL || 'https://gdevelop-assistant.vercel.app',
        assetGallery: 'https://gdevelop-assistant.vercel.app/asset-gallery',
        dashboard: 'https://dash.grudge-studio.com',
        nexus: 'https://grudachain.grudge-studio.com',
        devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases',
        islandHub: 'https://warlord-crafting-suite.vercel.app/island-hub',
        characters: 'https://client.grudge-studio.com/character',
        fleetConnect: 'https://grudachain.grudge-studio.com/grudge-fleet-connect.js'
      },
      playerHub: {
        characters: 'https://client.grudge-studio.com/character',
        island: 'https://warlord-crafting-suite.vercel.app/island-hub',
        saves: 'https://api.grudge-studio.com',
        account: 'https://id.grudge-studio.com',
        wcs: 'https://warlord-crafting-suite.vercel.app/dashboard'
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