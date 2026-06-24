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
      wcs: 'https://warlord-crafting-suite.vercel.app',
      nexus: 'https://grudachain.grudge-studio.com',
      gdevelop: 'https://gdevelop-assistant.vercel.app',
      grudgedot: 'https://gdevelop-assistant.vercel.app',
      objectStore: 'https://objectstore.grudge-studio.com',
      assets: 'https://assets.grudge-studio.com',
      grudgewarlords: 'https://client.grudge-studio.com',
      legion: 'https://ai.grudge-studio.com',
      grudaAgent: 'https://grudaagent.vercel.app',
      devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
      fleetConnect: 'https://grudachain.grudge-studio.com/grudge-fleet-connect.js'
    },
    playerHub: {
      characters: 'https://client.grudge-studio.com/character',
      island: 'https://warlord-crafting-suite.vercel.app/island-hub',
      saves: 'https://api.grudge-studio.com',
      wallet: 'https://warlord-crafting-suite.vercel.app/wallet'
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
      puterAI: true,
      legion: 'https://ai.grudge-studio.com',
      grudaAgent: 'https://grudaagent.vercel.app'
    },
    auth: {
      loginPage: 'https://id.grudge-studio.com/api/auth/page',
      endpoints: {
        login: 'GET /api/auth/page',
        register: 'GET /api/auth/page',
        guest: 'POST /api/auth/guest',
        verify: 'GET /api/auth/verify (Bearer token)',
        puterSso: 'POST /api/auth/puter-sso',
        discord: 'GET /api/auth/discord',
        github: 'GET /api/auth/github',
        puter: 'POST /api/auth/puter',
        wallet: 'POST /api/auth/wallet'
      }
    },
    timestamp: new Date().toISOString()
  });
};