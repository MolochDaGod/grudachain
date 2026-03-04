const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://auth-gateway-flax.vercel.app';

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const resp = await _fetch(`${AUTH_GATEWAY}/api/verify`, {
      headers: { 'Authorization': authHeader }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;
    return {
      grudgeId: data.grudgeId,
      username: data.username || data.user?.username,
      role: data.user?.role || 'player'
    };
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await verifyAdmin(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  res.json({
    success: true,
    user,
    stats: {
      platform: 'Vercel Serverless',
      region: process.env.VERCEL_REGION || 'unknown',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || 'production'
    },
    services: {
      authGateway: { url: AUTH_GATEWAY, status: 'connected' },
      nexusApi: { endpoints: 16, status: 'healthy' },
      vibeAi: { providers: 4, version: '8.0.0' }
    },
    routes: [
      'GET /api/health', 'GET /api/status',
      'POST /api/chat', 'POST /api/generate-code', 'POST /api/analyze-file',
      'GET /api/network/discover',
      'GET /api/vibe/providers', 'POST /api/vibe/chat',
      'GET /api/sdk/info',
      'GET /api/storage/info', 'GET /api/storage/list',
      'GET /api/auth/verify', 'POST /api/auth/guest',
      'GET /api/grudge-studio/config', 'GET /api/grudge-studio/links',
      'GET /api/admin/stats', 'GET /api/admin/ecosystem'
    ],
    timestamp: new Date().toISOString()
  });
};
