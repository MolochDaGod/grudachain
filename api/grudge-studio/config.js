const { CANONICAL, NEXUS_CANONICAL, NEXUS_ORIGIN, islandHub } = require('../_lib/canonical-urls');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    success: true,
    ecosystem: {
      authGateway: CANONICAL.auth,
      gameApi: CANONICAL.gameApi,
      dashboard: CANONICAL.dash,
      account: CANONICAL.account,
      wcs: CANONICAL.wcs,
      nexus: NEXUS_CANONICAL,
      nexusCanonical: NEXUS_CANONICAL,
      platform: CANONICAL.platform,
      game: CANONICAL.game,
      gdevelop: CANONICAL.gdevelop,
      grudgedot: CANONICAL.grudgedot,
      objectStore: CANONICAL.objectStore,
      assets: CANONICAL.assets,
      grudgewarlords: CANONICAL.warlords,
      legion: CANONICAL.legion,
      grudaAgent: CANONICAL.grudaAgent,
      devTool: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
      fleetConnect: `${NEXUS_ORIGIN}/grudge-fleet-connect.js`
    },
    playerHub: {
      characters: `${CANONICAL.warlords}/character`,
      island: islandHub(),
      saves: CANONICAL.gameApi,
      wallet: `${CANONICAL.wcs}/wallet`
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
      legion: CANONICAL.legion,
      grudaAgent: CANONICAL.grudaAgent
    },
    auth: {
      loginPage: CANONICAL.authLogin,
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