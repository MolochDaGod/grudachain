const SERVICES = [
  { slug: 'nexus-hub', name: 'GrudaChain Nexus Hub', platform: 'vercel', url: 'https://grudachain-rho.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'auth-gateway', name: 'Grudge Auth (SSO)', platform: 'vps', url: 'https://id.grudge-studio.com', type: 'auth', status: 'active', health_endpoint: '/health' },
  { slug: 'game-api', name: 'Grudge Game API', platform: 'vps', url: 'https://api.grudge-studio.com', type: 'api', status: 'active', health_endpoint: '/health' },
  { slug: 'unity-dedicated', name: 'Grudge Warlords Dedicated Server', platform: 'vps', url: 'https://grudgewarlords.com', type: 'game-server', status: 'active', health_endpoint: '/api/servers/unity/status' },
  { slug: 'wcs', name: 'Warlord Crafting Suite', platform: 'vercel', url: 'https://grudgewarlords.com', type: 'app', status: 'active' },
  { slug: 'gdevelop-assistant', name: 'GDevelop Assistant', platform: 'vercel', url: 'https://gdevelop-assistant.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'objectstore', name: 'ObjectStore Game Data', platform: 'github-pages', url: 'https://molochdagod.github.io/ObjectStore', type: 'cdn', status: 'active' },
  { slug: 'dashboard', name: 'Grudge Dashboard', platform: 'vps', url: 'https://dash.grudge-studio.com', type: 'app', status: 'active' },
  { slug: 'grudge-platform', name: 'Grudge Platform', platform: 'vercel', url: 'https://grudge-platform.vercel.app', type: 'launcher', status: 'active', health_endpoint: '/api/platform/health' },
  { slug: 'dungeon-crawler', name: 'Dungeon Crawler Quest', platform: 'vercel', url: 'https://dungeon-crawler-quest.vercel.app', type: 'game', status: 'active' }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({ success: true, services: SERVICES, count: SERVICES.length, timestamp: new Date().toISOString() });
};
