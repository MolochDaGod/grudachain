const { getSupabase } = require('../_lib/supabase');

// Fallback when Supabase is not configured
const FALLBACK_SERVICES = [
  { slug: 'nexus-hub', name: 'GrudaChain Nexus Hub', platform: 'vercel', url: 'https://grudachain-rho.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'auth-gateway', name: 'Grudge Auth (SSO)', platform: 'vps', url: 'https://id.grudge-studio.com', type: 'auth', status: 'active', health_endpoint: '/health' },
  { slug: 'game-api', name: 'Grudge Game API', platform: 'vps', url: 'https://api.grudge-studio.com', type: 'api', status: 'active', health_endpoint: '/health' },
  { slug: 'wcs', name: 'Warlord Crafting Suite', platform: 'vercel', url: 'https://grudgewarlords.com', type: 'app', status: 'active' },
  { slug: 'gdevelop-assistant', name: 'GDevelop Assistant', platform: 'vercel', url: 'https://gdevelop-assistant.vercel.app', type: 'app', status: 'active', health_endpoint: '/api/health' },
  { slug: 'objectstore', name: 'ObjectStore Game Data', platform: 'github-pages', url: 'https://molochdagod.github.io/ObjectStore', type: 'cdn', status: 'active' },
  { slug: 'dashboard', name: 'Grudge Dashboard', platform: 'vps', url: 'https://dash.grudge-studio.com', type: 'app', status: 'active' }
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
