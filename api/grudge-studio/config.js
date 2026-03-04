module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    ecosystem: {
      authGateway: 'https://auth-gateway-flax.vercel.app',
      wcs: 'https://warlord-crafting-suite.vercel.app',
      nexus: 'https://grudachain-rho.vercel.app',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      objectStore: 'https://molochdagod.github.io/ObjectStore',
      grudaLegion: 'https://gruda-legion-production.up.railway.app',
      grudgewarlords: 'https://grudgewarlords.com',
      platform: 'https://grudge-platform.vercel.app',
      puterCloud: 'https://grudge-studio.puter.site'
    },
    sdk: {
      name: 'grudge-studio',
      version: '1.2.0',
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod/GrudgeStudioNPM'
    },
    ai: {
      vibeVersion: '8.0.0',
      providers: ['megallm', 'openrouter', 'agentrouter', 'routeway'],
      puterAI: true
    },
    auth: {
      endpoints: {
        login: 'POST /api/login',
        register: 'POST /api/register',
        guest: 'POST /api/guest',
        verify: 'GET /api/verify (Bearer token)',
        discord: 'GET /api/discord',
        github: 'GET /api/github',
        puter: 'POST /api/puter',
        wallet: 'POST /api/connect-wallet'
      }
    },
    timestamp: new Date().toISOString()
  });
};
