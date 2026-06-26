const { CANONICAL, NEXUS_CANONICAL, NEXUS_ORIGIN, islandHub } = require('../_lib/canonical-urls');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    links: {
      main: CANONICAL.warlords,
      warlords: CANONICAL.warlords,
      auth: CANONICAL.auth,
      gameApi: CANONICAL.gameApi,
      dashboard: CANONICAL.dash,
      nexus: NEXUS_CANONICAL,
      nexusCanonical: NEXUS_CANONICAL,
      platform: CANONICAL.platform,
      game: CANONICAL.game,
      wcs: CANONICAL.wcs,
      islandHub: islandHub(),
      characters: `${CANONICAL.warlords}/character`,
      gdevelop: CANONICAL.gdevelop,
      grudgedot: CANONICAL.grudgedot,
      devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
      legion: CANONICAL.legion,
      grudaAgent: CANONICAL.grudaAgent,
      objectStore: CANONICAL.objectStore,
      assets: CANONICAL.assets,
      fleetConnect: `${NEXUS_ORIGIN}/grudge-fleet-connect.js`,
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod',
      discord: 'https://discord.gg/FtGtmxmwkh'
    },
    timestamp: new Date().toISOString()
  });
};