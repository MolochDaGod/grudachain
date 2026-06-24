const { NEXUS_CANONICAL, NEXUS_ORIGIN } = require('../_lib/nexus-origin');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    links: {
      main: 'https://client.grudge-studio.com',
      warlords: 'https://client.grudge-studio.com',
      auth: 'https://id.grudge-studio.com',
      gameApi: 'https://api.grudge-studio.com',
      dashboard: 'https://dash.grudge-studio.com',
      nexus: NEXUS_ORIGIN,
      nexusCanonical: NEXUS_CANONICAL,
      wcs: 'https://warlord-crafting-suite.vercel.app',
      islandHub: 'https://warlord-crafting-suite.vercel.app/island-hub',
      characters: 'https://client.grudge-studio.com/character',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      grudgedot: 'https://gdevelop-assistant.vercel.app',
      devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
      legion: 'https://ai.grudge-studio.com',
      grudaAgent: 'https://grudaagent.vercel.app',
      objectStore: 'https://objectstore.grudge-studio.com',
      assets: 'https://assets.grudge-studio.com',
      fleetConnect: `${NEXUS_ORIGIN}/grudge-fleet-connect.js`,
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod',
      discord: 'https://discord.gg/FtGtmxmwkh'
    },
    timestamp: new Date().toISOString()
  });
};