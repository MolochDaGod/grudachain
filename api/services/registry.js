const { CANONICAL, NEXUS_CANONICAL } = require('../_lib/canonical-urls');

const SERVICES = [
  { slug: 'nexus-hub', name: 'GrudaChain Nexus Hub', platform: 'vercel', url: NEXUS_CANONICAL, canonical_url: NEXUS_CANONICAL, type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'auth-gateway', name: 'Grudge Auth (SSO)', platform: 'vps', url: CANONICAL.auth, type: 'auth', status: 'active', health_endpoint: '/health' },
  { slug: 'game-api', name: 'Grudge Game API', platform: 'vps', url: CANONICAL.gameApi, type: 'api', status: 'active', health_endpoint: '/health' },
  { slug: 'unity-dedicated', name: 'Grudge Warlords Dedicated Server', platform: 'vps', url: CANONICAL.grudgewarlords, type: 'game-server', status: 'active', health_endpoint: '/api/servers/unity/status' },
  { slug: 'wcs', name: 'Warlord Crafting Suite', platform: 'vercel', url: CANONICAL.wcs, type: 'app', status: 'active' },
  { slug: 'gdevelop-assistant', name: 'grudgeDot / GDevelop Assistant', platform: 'vercel', url: CANONICAL.grudgedot, type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'grudge-dev-tool', name: 'Grudge Studio Forge (Desktop)', platform: 'github', url: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest', type: 'devtools', status: 'active' },
  { slug: 'legion-ai', name: 'Legion AI Hub', platform: 'cloudflare-worker', url: CANONICAL.legion, type: 'ai', status: 'active' },
  { slug: 'gruda-agent', name: 'GRUDA Agent', platform: 'vercel', url: CANONICAL.grudaAgent, type: 'ai', status: 'active' },
  { slug: 'objectstore', name: 'ObjectStore Game Data', platform: 'cloudflare-worker', url: CANONICAL.objectStore, type: 'cdn', status: 'active' },
  { slug: 'assets-cdn', name: 'Asset CDN (R2)', platform: 'r2', url: CANONICAL.assets, type: 'cdn', status: 'active' },
  { slug: 'dashboard', name: 'Grudge Dashboard', platform: 'vps', url: CANONICAL.dash, type: 'app', status: 'active' },
  { slug: 'grudge-platform', name: 'Grudge Platform', platform: 'vercel', url: CANONICAL.platform, type: 'launcher', status: 'active', health_endpoint: '/api/platform/health' },
  { slug: 'grudge-tactics', name: 'Grudge Tactics', platform: 'vercel', url: CANONICAL.game, type: 'game', status: 'active' },
  { slug: 'dungeon-crawler', name: 'Dungeon Crawler Quest', platform: 'vercel', url: 'https://dungeon-crawler-quest.vercel.app', type: 'game', status: 'active' },
  { slug: 'fleet-connect', name: 'Fleet Connect Widget', platform: 'vercel', url: `${NEXUS_CANONICAL}/grudge-fleet-connect.js`, type: 'sdk', status: 'active' }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({ success: true, services: SERVICES, count: SERVICES.length, timestamp: new Date().toISOString() });
};