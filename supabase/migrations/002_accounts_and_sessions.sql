-- ════════════════════════════════════════════════════════════════════════
-- Migration 002: Accounts, Game Sessions, and Launch Events
-- Applies to: GrudaChain Railway Postgres
-- Run via: psql $DATABASE_URL -f supabase/migrations/002_accounts_and_sessions.sql
-- ════════════════════════════════════════════════════════════════════════

-- ── grudge_accounts ─────────────────────────────────────────────────────
-- Central player account table. Linked to puter IDs for guest-to-member flow.

CREATE TABLE IF NOT EXISTS grudge_accounts (
  grudge_id     TEXT        PRIMARY KEY,                -- e.g. "gruda-a1b2c3d4"
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        UNIQUE,                     -- null for pure puter/guest accounts
  puter_id      TEXT        UNIQUE,                     -- puter.js guest/user ID
  avatar        TEXT,                                   -- URL to avatar image
  level         INTEGER     NOT NULL DEFAULT 1,
  faction       TEXT        NOT NULL DEFAULT 'none',    -- none | pirates | empire | rebels | etc.
  role          TEXT        NOT NULL DEFAULT 'pleb',    -- pleb | member | admin | master-admin
  titles        TEXT[]      DEFAULT '{}',               -- unlocked titles array
  preferences   JSONB       DEFAULT '{}',               -- UI preferences, keybinds, etc.
  stats         JSONB       DEFAULT '{}',               -- game stats (kills, deaths, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by puter_id and email
CREATE INDEX IF NOT EXISTS idx_grudge_accounts_puter_id ON grudge_accounts (puter_id);
CREATE INDEX IF NOT EXISTS idx_grudge_accounts_email    ON grudge_accounts (email);
CREATE INDEX IF NOT EXISTS idx_grudge_accounts_faction  ON grudge_accounts (faction);

-- ── game_sessions ────────────────────────────────────────────────────────
-- Tracks each player game session (one row per session start).

CREATE TABLE IF NOT EXISTS game_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grudge_id     TEXT        REFERENCES grudge_accounts(grudge_id) ON DELETE SET NULL,
  game_slug     TEXT        NOT NULL,                   -- e.g. "grudge-warlords"
  room_id       TEXT,                                   -- Colyseus room ID if applicable
  status        TEXT        NOT NULL DEFAULT 'active',  -- active | ended | crashed
  metadata      JSONB       DEFAULT '{}',               -- arbitrary per-game data
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_grudge_id  ON game_sessions (grudge_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_slug  ON game_sessions (game_slug);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status     ON game_sessions (status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions (started_at DESC);

-- ── launch_events ────────────────────────────────────────────────────────
-- Lightweight event log for every game launch (used for analytics).

CREATE TABLE IF NOT EXISTS launch_events (
  id            BIGSERIAL   PRIMARY KEY,
  grudge_id     TEXT,                                   -- null = anonymous/guest launch
  game_slug     TEXT        NOT NULL,
  source        TEXT        NOT NULL DEFAULT 'unknown', -- gdevelop | platform | direct | wcs
  launched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_launch_events_grudge_id   ON launch_events (grudge_id);
CREATE INDEX IF NOT EXISTS idx_launch_events_game_slug   ON launch_events (game_slug);
CREATE INDEX IF NOT EXISTS idx_launch_events_launched_at ON launch_events (launched_at DESC);

-- ════════════════════════════════════════════════════════════════════════
-- Helper: auto-update updated_at on grudge_accounts
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grudge_accounts_updated_at ON grudge_accounts;
CREATE TRIGGER trg_grudge_accounts_updated_at
  BEFORE UPDATE ON grudge_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
