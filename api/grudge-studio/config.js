module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    ecosystem: {
      authGateway: 'https://id.grudge-studio.com',
      gameApi: 'https://api.grudge-studio.com',
      dashboard: 'https://dash.grudge-studio.com',
      account: 'https://account.grudge-studio.com',
      wcs: 'https://grudgewarlords.com',
      nexus: 'https://grudachain-rho.vercel.app',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      objectStore: 'https://molochdagod.github.io/ObjectStore',
      grudgewarlords: 'https://grudgewarlords.com'
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
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        guest: 'POST /auth/guest',
        verify: 'POST /auth/verify (Bearer token)',
        discord: 'GET /auth/discord',
        github: 'GET /auth/github',
        puter: 'POST /auth/puter',
        wallet: 'POST /auth/wallet'
      }
    },
    timestamp: new Date().toISOString()
  });
};
