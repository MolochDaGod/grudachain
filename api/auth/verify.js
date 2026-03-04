const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://auth-gateway-flax.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Bearer token required' });
  }

  try {
    const resp = await _fetch(`${AUTH_GATEWAY}/api/verify`, {
      headers: { 'Authorization': authHeader }
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Auth gateway unreachable', details: err.message });
  }
};
