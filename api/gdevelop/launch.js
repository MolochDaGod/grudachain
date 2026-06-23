const { GRUDGE_GAMES } = require('../_lib/gdevelop-catalog');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { grudgeId, gameSlug, source = 'gdevelop' } = req.body || {};

  if (!gameSlug) {
    return res.status(400).json({ error: 'gameSlug is required' });
  }

  const game = GRUDGE_GAMES.find(g => g.slug === gameSlug);
  if (!game) {
    return res.status(404).json({ error: `Unknown game slug: ${gameSlug}` });
  }

  const event = {
    grudge_id: grudgeId || null,
    game_slug: gameSlug,
    source,
    launched_at: new Date().toISOString()
  };

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO launch_events (grudge_id, game_slug, source, launched_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [event.grudge_id, event.game_slug, event.source, event.launched_at]
      );
    }
  } catch (err) {
    console.warn('[gdevelop/launch] DB write skipped:', err.message);
  }

  res.json({
    success: true,
    event,
    game: { name: game.name, url: game.url },
    timestamp: new Date().toISOString()
  });
};