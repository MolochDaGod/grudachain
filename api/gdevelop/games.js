const { filterGames } = require('../_lib/gdevelop-catalog');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const games = filterGames(req.query);
  res.json({
    success: true,
    games,
    count: games.length,
    timestamp: new Date().toISOString()
  });
};