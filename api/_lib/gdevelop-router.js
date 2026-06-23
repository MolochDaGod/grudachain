const { Router } = require('express');
const { getGdevelopConfig, filterGames, GRUDGE_GAMES } = require('./gdevelop-catalog');

const router = Router();

router.options('*', (req, res) => res.status(200).end());

router.get('/config', (req, res) => {
  res.json(getGdevelopConfig());
});

router.get('/games', (req, res) => {
  const games = filterGames(req.query);
  res.json({
    success: true,
    games,
    count: games.length,
    timestamp: new Date().toISOString()
  });
});

router.post('/launch', async (req, res) => {
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

  console.log(`[gdevelop] Launch: ${gameSlug} by ${grudgeId || 'guest'} via ${source}`);

  res.json({
    success: true,
    event,
    game: { name: game.name, url: game.url },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;