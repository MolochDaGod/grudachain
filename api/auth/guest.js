const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const resp = await _fetch(`${AUTH_GATEWAY}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Auth gateway unreachable', details: err.message });
  }
};
