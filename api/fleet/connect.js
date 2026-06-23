/**
 * GET /api/fleet/connect
 * Canonical fleet connectivity manifest for embeddable widgets and launchers.
 */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const nexus = 'https://grudachain.grudge-studio.com';

  res.json({
    success: true,
    version: '1.0.0',
    widget: `${nexus}/grudge-fleet-connect.js`,
    sso: `${nexus}/grudge-sso.js`,
    auth: {
      gateway: 'https://id.grudge-studio.com',
      login: 'https://id.grudge-studio.com/auth',
      verify: 'https://id.grudge-studio.com/api/auth/verify'
    },
    api: {
      game: 'https://api.grudge-studio.com',
      assets: 'https://assets.grudge-studio.com',
      objectStore: 'https://objectstore.grudge-studio.com',
      ai: 'https://ai.grudge-studio.com',
      grudaAgent: 'https://grudaagent.vercel.app'
    },
    playerHub: {
      characters: 'https://client.grudge-studio.com/character',
      island: 'https://warlord-crafting-suite.vercel.app/island-hub',
      homeIsland: 'https://client.grudge-studio.com/island',
      warlords: 'https://client.grudge-studio.com',
      wcs: 'https://warlord-crafting-suite.vercel.app/dashboard',
      saves: 'https://api.grudge-studio.com',
      account: 'https://id.grudge-studio.com',
      wallet: 'https://warlord-crafting-suite.vercel.app/wallet'
    },
    tools: {
      nexus: nexus,
      grudgedot: 'https://gdevelop-assistant.vercel.app',
      devTool: {
        label: 'Grudge Studio Forge',
        version: '0.4.0',
        download: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
        repo: 'https://github.com/MolochDaGod/grudge-dev-tool'
      },
      legion: 'https://ai.grudge-studio.com',
      grudaAgent: 'https://grudaagent.vercel.app',
      platform: 'https://grudge-platform.vercel.app',
      launcher: 'https://launcher.grudge-studio.com'
    },
    quickLinks: [
      { id: 'sign-in', label: 'Grudge ID', icon: 'shield', url: 'https://id.grudge-studio.com', category: 'auth' },
      { id: 'characters', label: 'My Characters', icon: 'user', url: 'https://client.grudge-studio.com/character', category: 'player' },
      { id: 'island', label: 'Home Island', icon: 'island', url: 'https://warlord-crafting-suite.vercel.app/island-hub', category: 'player' },
      { id: 'warlords', label: 'Play Warlords', icon: 'sword', url: 'https://client.grudge-studio.com', category: 'game' },
      { id: 'grudgedot', label: 'grudgeDot', icon: 'gamepad', url: 'https://gdevelop-assistant.vercel.app', category: 'tool' },
      { id: 'nexus', label: 'Nexus Hub', icon: 'link', url: nexus, category: 'tool' },
      { id: 'dev-tool', label: 'Studio Forge', icon: 'hammer', url: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest', category: 'tool' },
      { id: 'legion', label: 'Legion AI', icon: 'brain', url: 'https://ai.grudge-studio.com', category: 'ai' },
      { id: 'wcs', label: 'Crafting Suite', icon: 'craft', url: 'https://warlord-crafting-suite.vercel.app', category: 'game' }
    ],
    ssoDomains: [
      'grudachain.grudge-studio.com',
      'grudachain-rho.vercel.app',
      'gdevelop-assistant.vercel.app',
      'grudge-platform.vercel.app',
      'warlord-crafting-suite.vercel.app',
      'client.grudge-studio.com',
      'grudgewarlords.com',
      'id.grudge-studio.com'
    ],
    timestamp: new Date().toISOString()
  });
};