const { runFleetMismatchAudit } = require('../_lib/fleet-mismatch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers['x-fleet-origin'] || 'https://grudachain.grudge-studio.com';
  const audit = await runFleetMismatchAudit(origin);
  res.json(audit);
};