const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const { CANONICAL, NEXUS_CANONICAL } = require('../_lib/canonical-urls');

const SERVICES = [
  { slug: 'nexus-hub', name: 'Nexus Hub', url: `${NEXUS_CANONICAL}/api/health` },
  { slug: 'auth-gateway', name: 'Grudge Auth (SSO)', url: `${CANONICAL.auth}/health` },
  { slug: 'game-api', name: 'Grudge Game API', url: `${CANONICAL.gameApi}/health` },
  { slug: 'wcs', name: 'Grudge Warlords', url: CANONICAL.grudgewarlords },
  { slug: 'unity-dedicated', name: 'Unity Dedicated Server', url: `${CANONICAL.grudgewarlords}/api/servers/unity/status` },
  { slug: 'gdevelop', name: 'GDevelop Assistant', url: `${CANONICAL.grudgedot}/api/health` },
  { slug: 'objectstore', name: 'ObjectStore', url: CANONICAL.objectStore },
  { slug: 'dashboard', name: 'Grudge Dashboard', url: CANONICAL.dash },
  { slug: 'grudge-platform', name: 'Grudge Platform', url: `${CANONICAL.platform}/api/platform/health` },
  { slug: 'dungeon-crawler', name: 'Dungeon Crawler Quest', url: 'https://dungeon-crawler-quest.vercel.app' }
];

async function probeService(svc) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await _fetch(svc.url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return { slug: svc.slug, name: svc.name, status: res.ok ? 'healthy' : 'degraded', httpStatus: res.status, latencyMs: Date.now() - start };
  } catch (e) {
    return { slug: svc.slug, name: svc.name, status: 'offline', error: e.name === 'AbortError' ? 'timeout' : e.message, latencyMs: Date.now() - start };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = await Promise.all(SERVICES.map(probeService));

  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;

  res.json({
    success: true,
    summary: { healthy, degraded: results.filter(r => r.status === 'degraded').length, offline: results.filter(r => r.status === 'offline').length, total },
    services: results,
    timestamp: new Date().toISOString()
  });
};