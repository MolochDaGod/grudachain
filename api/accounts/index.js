const { Router } = require('express');
const router = Router();

// ── CORS preflight ──────────────────────────────────────────────
router.options('*', (req, res) => res.status(200).end());

// ── Auth middleware (loaded lazily from server context) ──────────
// The verifyGrudgeToken middleware is defined in server.js and injected
// at mount time. For standalone use, we provide a lightweight fallback.
function requireAuth(req, res, next) {
  if (!req.grudgeUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ── Helpers ──────────────────────────────────────────────────────
function sanitizeProfile(row) {
  const { password_hash, ...safe } = row;
  return safe;
}

/**
 * POST /api/accounts/register
 * Create a new Grudge account.
 * Body: { username, email?, puterId?, grudgeId? }
 * If grudgeId is not provided, one is generated from puterId or random UUID.
 */
router.post('/register', async (req, res) => {
  const { username, email, puterId, grudgeId: requestedId } = req.body || {};

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  const grudgeId = requestedId || puterId
    ? `gruda-${(puterId || require('crypto').randomUUID()).slice(0, 8)}`
    : `gruda-${require('crypto').randomUUID().slice(0, 8)}`;

  const now = new Date().toISOString();

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (!pool) throw new Error('Database unavailable');

    // Check username uniqueness
    const exists = await pool.query(
      'SELECT grudge_id FROM grudge_accounts WHERE username = $1',
      [username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const result = await pool.query(
      `INSERT INTO grudge_accounts
         (grudge_id, username, email, puter_id, level, faction, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 1, 'none', 'pleb', $5, $5)
       RETURNING *`,
      [grudgeId, username, email || null, puterId || null, now]
    );

    return res.status(201).json({
      success: true,
      account: sanitizeProfile(result.rows[0]),
      timestamp: now
    });
  } catch (err) {
    console.error('[accounts/register]', err.message);
    return res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

/**
 * GET /api/accounts/me
 * Returns the authenticated player's full profile.
 * Requires Bearer token (verifyGrudgeToken middleware attached in server.js).
 */
router.get('/me', requireAuth, async (req, res) => {
  const { grudgeId } = req.grudgeUser;

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (!pool) throw new Error('Database unavailable');

    const result = await pool.query(
      'SELECT * FROM grudge_accounts WHERE grudge_id = $1',
      [grudgeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found', grudgeId });
    }

    return res.json({
      success: true,
      account: sanitizeProfile(result.rows[0]),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[accounts/me]', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile', detail: err.message });
  }
});

/**
 * PUT /api/accounts/me
 * Update mutable profile fields. Allowed: username, avatar, faction, preferences.
 * Requires Bearer token.
 */
router.put('/me', requireAuth, async (req, res) => {
  const { grudgeId } = req.grudgeUser;
  const { username, avatar, faction, preferences } = req.body || {};

  const fields = [];
  const values = [];
  let idx = 1;

  if (username)     { fields.push(`username = $${idx++}`);     values.push(username); }
  if (avatar)       { fields.push(`avatar = $${idx++}`);       values.push(avatar); }
  if (faction)      { fields.push(`faction = $${idx++}`);      values.push(faction); }
  if (preferences)  { fields.push(`preferences = $${idx++}`);  values.push(JSON.stringify(preferences)); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  fields.push(`updated_at = $${idx++}`);
  values.push(new Date().toISOString());
  values.push(grudgeId);

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (!pool) throw new Error('Database unavailable');

    const result = await pool.query(
      `UPDATE grudge_accounts SET ${fields.join(', ')} WHERE grudge_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({
      success: true,
      account: sanitizeProfile(result.rows[0]),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[accounts/me PUT]', err.message);
    return res.status(500).json({ error: 'Failed to update profile', detail: err.message });
  }
});

/**
 * POST /api/accounts/link/puter
 * Link a puter guest ID to an existing or new GrudgeID.
 * Body: { puterId, grudgeId? }
 * Creates an account row if none exists for the puterId.
 */
router.post('/link/puter', async (req, res) => {
  const { puterId, grudgeId: existingGrudgeId } = req.body || {};

  if (!puterId) {
    return res.status(400).json({ error: 'puterId is required' });
  }

  const now = new Date().toISOString();

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (!pool) throw new Error('Database unavailable');

    // Check if puterId is already linked
    const existing = await pool.query(
      'SELECT * FROM grudge_accounts WHERE puter_id = $1',
      [puterId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        linked: false,
        message: 'PuterId already linked',
        account: sanitizeProfile(existing.rows[0]),
        timestamp: now
      });
    }

    // If grudgeId provided, link to it
    if (existingGrudgeId) {
      const result = await pool.query(
        `UPDATE grudge_accounts SET puter_id = $1, updated_at = $2
         WHERE grudge_id = $3 RETURNING *`,
        [puterId, now, existingGrudgeId]
      );

      if (result.rows.length > 0) {
        return res.json({
          success: true,
          linked: true,
          account: sanitizeProfile(result.rows[0]),
          timestamp: now
        });
      }
    }

    // Create a new guest account linked to puterId
    const newGrudgeId = `gruda-${puterId.slice(0, 8)}`;
    const username = `Warlord_${puterId.slice(0, 6)}`;

    const result = await pool.query(
      `INSERT INTO grudge_accounts
         (grudge_id, username, puter_id, level, faction, role, created_at, updated_at)
       VALUES ($1, $2, $3, 1, 'none', 'pleb', $4, $4)
       ON CONFLICT (grudge_id) DO UPDATE SET puter_id = $3, updated_at = $4
       RETURNING *`,
      [newGrudgeId, username, puterId, now]
    );

    return res.status(201).json({
      success: true,
      linked: true,
      created: true,
      account: sanitizeProfile(result.rows[0]),
      timestamp: now
    });
  } catch (err) {
    console.error('[accounts/link/puter]', err.message);
    return res.status(500).json({ error: 'Failed to link puter ID', detail: err.message });
  }
});

/**
 * GET /api/accounts/:grudgeId/public
 * Returns the public profile for any player. No auth required.
 */
router.get('/:grudgeId/public', async (req, res) => {
  const { grudgeId } = req.params;

  try {
    const db = require('../../lib/db');
    const pool = db.getPool();
    if (!pool) throw new Error('Database unavailable');

    const result = await pool.query(
      `SELECT grudge_id, username, avatar, level, faction, role, titles, created_at
       FROM grudge_accounts WHERE grudge_id = $1`,
      [grudgeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found', grudgeId });
    }

    return res.json({
      success: true,
      profile: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[accounts/public]', err.message);
    return res.status(500).json({ error: 'Failed to fetch public profile', detail: err.message });
  }
});

module.exports = router;
