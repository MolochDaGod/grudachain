module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    links: {
      main: 'https://grudgewarlords.com',
      auth: 'https://id.grudge-studio.com',
      gameApi: 'https://api.grudge-studio.com',
      dashboard: 'https://dash.grudge-studio.com',
      nexus: 'https://grudachain-rho.vercel.app',
      wcs: 'https://grudgewarlords.com',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      objectStore: 'https://molochdagod.github.io/ObjectStore',
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod',
      discord: 'https://discord.gg/FtGtmxmwkh'
    },
    timestamp: new Date().toISOString()
  });
};

