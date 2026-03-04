const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const { getSupabase } = require('../_lib/supabase');

const SERVICES = [
  { slug: 'nexus-hub', name: 'Nexus Hub', url: 'https://grudachain-rho.vercel.app/api/health' },
  { slug: 'auth-gateway', name: 'Auth Gateway', url: 'https://auth-gateway-flax.vercel.app/api/health' },
  { slug: 'wcs', name: 'WCS', url: 'https://warlord-crafting-suite.vercel.app' },
  { slug: 'gdevelop', name: 'GDevelop Assistant', url: 'https://gdevelop-assistant.vercel.app/api/health' },
  { slug: 'objectstore', name: 'ObjectStore', url: 'https://molochdagod.github.io/ObjectStore' },
  { slug: 'grudge-platform', name: 'Platform', url: 'https://grudge-platform.vercel.app' },
  { slug: 'gruda-legion', name: 'Railway AI Node', url: 'https://gruda-legion-production.up.railway.app/health' },
  { slug: 'puter-cloud', name: 'Puter Cloud', url: 'https://grudge-studio.puter.site' }
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

  // Optionally write health results back to Supabase
  const supabase = getSupabase();
  if (supabase) {
    const now = new Date().toISOString();
    for (const r of results) {
      supabase.from('service_registry')
        .update({ last_health_check: now, last_health_status: r.httpStatus || 0, status: r.status === 'healthy' ? 'active' : r.status })
        .eq('slug', r.slug)
        .then(() => {}) // fire-and-forget
        .catch(() => {});
    }
  }

  res.json({
    success: true,
    summary: { healthy, degraded: results.filter(r => r.status === 'degraded').length, offline: results.filter(r => r.status === 'offline').length, total },
    services: results,
    timestamp: new Date().toISOString()
  });
};
