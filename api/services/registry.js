const { getSupabase } = require('../_lib/supabase');

// Fallback when Supabase is not configured
const FALLBACK_SERVICES = [
  { slug: 'nexus-hub', name: 'GrudaChain Nexus Hub', platform: 'vercel', url: 'https://grudachain-rho.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'auth-gateway', name: 'Auth Gateway', platform: 'vercel', url: 'https://auth-gateway-flax.vercel.app', type: 'auth', status: 'active', health_endpoint: '/api/health' },
  { slug: 'wcs', name: 'Warlord Crafting Suite', platform: 'vercel', url: 'https://warlord-crafting-suite.vercel.app', type: 'app', status: 'active' },
  { slug: 'gdevelop-assistant', name: 'GDevelop Assistant', platform: 'vercel', url: 'https://gdevelop-assistant.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'objectstore', name: 'ObjectStore Game Data', platform: 'github-pages', url: 'https://molochdagod.github.io/ObjectStore', type: 'cdn', status: 'active' },
  { slug: 'grudge-platform', name: 'Grudge Platform', platform: 'vercel', url: 'https://grudge-platform.vercel.app', type: 'app', status: 'active' },
  { slug: 'gruda-legion', name: 'GRUDA Legion AI Node', platform: 'railway', url: 'https://gruda-legion-production.up.railway.app', type: 'api', status: 'active', health_endpoint: '/health' },
  { slug: 'puter-cloud', name: 'Puter Cloud Dashboard', platform: 'puter', url: 'https://grudge-studio.puter.site', type: 'app', status: 'active' }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('service_registry')
        .select('*')
        .order('type', { ascending: true });

      if (!error && data) {
        return res.json({ success: true, source: 'supabase', services: data, count: data.length, timestamp: new Date().toISOString() });
      }
    } catch (e) {
      // fall through to fallback
    }
  }

  res.json({ success: true, source: 'fallback', services: FALLBACK_SERVICES, count: FALLBACK_SERVICES.length, timestamp: new Date().toISOString() });
};
