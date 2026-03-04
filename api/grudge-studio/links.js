module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    links: {
      main: 'https://grudgewarlords.com',
      nexus: 'https://grudachain-rho.vercel.app',
      wcs: 'https://warlord-crafting-suite.vercel.app',
      auth: 'https://auth-gateway-flax.vercel.app',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      objectStore: 'https://molochdagod.github.io/ObjectStore',
      legion: 'https://gruda-legion-production.up.railway.app',
      platform: 'https://grudge-platform.vercel.app',
      puterCloud: 'https://grudge-studio.puter.site',
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod',
      discord: 'https://discord.gg/grudgewarlords'
    },
    timestamp: new Date().toISOString()
  });
};
