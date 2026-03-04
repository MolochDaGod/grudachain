-- ============================================
-- Grudge Studio: Game Servers & Service Registry
-- Tracks all deployed services, Colyseus rooms, and app connections
-- ============================================

-- Service Registry: all deployed Grudge Studio apps
CREATE TABLE IF NOT EXISTS service_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,               -- 'vercel', 'railway', 'github-pages', 'puter', 'colyseus-cloud'
  url TEXT NOT NULL,
  health_endpoint TEXT,                  -- e.g. '/api/health' or '/health'
  type TEXT NOT NULL DEFAULT 'app',      -- 'app', 'api', 'game-server', 'cdn', 'auth', 'database'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'degraded', 'offline', 'maintenance'
  version TEXT,
  repo_url TEXT,
  branch TEXT DEFAULT 'main',
  env_vars JSONB DEFAULT '[]'::jsonb,    -- list of required env var names (not values)
  tags TEXT[] DEFAULT '{}',
  last_health_check TIMESTAMPTZ,
  last_health_status INTEGER,            -- HTTP status code
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Game Servers: Colyseus rooms, Socket.IO instances, etc.
CREATE TABLE IF NOT EXISTS game_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES service_registry(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'colyseus', 'socketio', 'websocket', 'dedicated'
  region TEXT DEFAULT 'us-east-1',
  url TEXT NOT NULL,
  ws_url TEXT,                           -- WebSocket URL
  status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'offline', 'full', 'maintenance'
  max_players INTEGER DEFAULT 100,
  current_players INTEGER DEFAULT 0,
  rooms JSONB DEFAULT '[]'::jsonb,       -- active room list [{roomId, type, players, maxPlayers}]
  config JSONB DEFAULT '{}'::jsonb,      -- server-specific config
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Colyseus Room Types: defines available room types
CREATE TABLE IF NOT EXISTS colyseus_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES game_servers(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,               -- 'lobby', 'island', 'arena', 'dungeon'
  display_name TEXT NOT NULL,
  description TEXT,
  max_clients INTEGER DEFAULT 20,
  schema_version TEXT DEFAULT '1.0.0',
  auth_required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,      -- room-specific defaults
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connected Apps: tracks which apps are integrated with which services
CREATE TABLE IF NOT EXISTS connected_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug TEXT NOT NULL,                -- references service_registry.slug
  connects_to TEXT NOT NULL,             -- references service_registry.slug
  connection_type TEXT NOT NULL,         -- 'auth', 'api', 'websocket', 'database', 'cdn'
  config JSONB DEFAULT '{}'::jsonb,      -- connection-specific config (endpoints, headers)
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_slug, connects_to, connection_type)
);

-- Deployment Log: tracks deployments across all services
CREATE TABLE IF NOT EXISTS deployment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug TEXT NOT NULL,
  commit_hash TEXT,
  commit_message TEXT,
  deployer TEXT,                         -- username or 'auto'
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'building', 'success', 'failed'
  build_duration_ms INTEGER,
  url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_service_registry_type ON service_registry(type);
CREATE INDEX IF NOT EXISTS idx_service_registry_status ON service_registry(status);
CREATE INDEX IF NOT EXISTS idx_game_servers_status ON game_servers(status);
CREATE INDEX IF NOT EXISTS idx_game_servers_type ON game_servers(type);
CREATE INDEX IF NOT EXISTS idx_colyseus_rooms_server ON colyseus_room_types(server_id);
CREATE INDEX IF NOT EXISTS idx_connected_apps_slug ON connected_apps(app_slug);
CREATE INDEX IF NOT EXISTS idx_deployment_log_service ON deployment_log(service_slug);
CREATE INDEX IF NOT EXISTS idx_deployment_log_created ON deployment_log(created_at DESC);

-- ── Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_registry_updated ON service_registry;
CREATE TRIGGER trg_service_registry_updated
  BEFORE UPDATE ON service_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_game_servers_updated ON game_servers;
CREATE TRIGGER trg_game_servers_updated
  BEFORE UPDATE ON game_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: Register all Grudge Studio services ──
INSERT INTO service_registry (slug, name, platform, url, health_endpoint, type, status, repo_url, branch, tags) VALUES
  ('nexus-hub', 'GrudaChain Nexus Hub', 'vercel', 'https://grudachain-rho.vercel.app', '/api/health', 'app', 'active', 'https://github.com/MolochDaGod/grudachain', 'master', ARRAY['nexus','hub','central']),
  ('auth-gateway', 'Auth Gateway', 'vercel', 'https://auth-gateway-flax.vercel.app', '/api/health', 'auth', 'active', 'https://github.com/MolochDaGod/auth-gateway', 'main', ARRAY['auth','jwt','login']),
  ('wcs', 'Warlord Crafting Suite', 'vercel', 'https://warlord-crafting-suite.vercel.app', '/', 'app', 'active', 'https://github.com/MolochDaGod/Warlord-Crafting-Suite', 'main', ARRAY['crafting','game-systems','battle']),
  ('gdevelop-assistant', 'GDevelop Assistant', 'vercel', 'https://gdevelop-assistant.vercel.app', '/api/health', 'app', 'active', 'https://github.com/MolochDaGod/GDevelopAssistant', 'main', ARRAY['ai','game-dev','editor']),
  ('objectstore', 'ObjectStore Game Data', 'github-pages', 'https://molochdagod.github.io/ObjectStore', '/', 'cdn', 'active', 'https://github.com/MolochDaGod/ObjectStore', 'main', ARRAY['data','weapons','sprites','api']),
  ('grudge-platform', 'Grudge Platform', 'vercel', 'https://grudge-platform.vercel.app', '/', 'app', 'active', 'https://github.com/MolochDaGod/grudge-platform', 'Nexus', ARRAY['launcher','platform']),
  ('gruda-legion', 'GRUDA Legion AI Node', 'railway', 'https://gruda-legion-production.up.railway.app', '/health', 'api', 'active', 'https://github.com/MolochDaGod/grudachain', 'master', ARRAY['ai','socket.io','railway']),
  ('puter-cloud', 'Puter Cloud Dashboard', 'puter', 'https://grudge-studio.puter.site', '/', 'app', 'active', NULL, NULL, ARRAY['puter','storage','ai']),
  ('grudge-npm', 'grudge-studio NPM', 'npm', 'https://www.npmjs.com/package/grudge-studio', NULL, 'cdn', 'active', 'https://github.com/MolochDaGod/GrudgeStudioNPM', 'main', ARRAY['sdk','npm','package'])
ON CONFLICT (slug) DO UPDATE SET
  url = EXCLUDED.url,
  health_endpoint = EXCLUDED.health_endpoint,
  status = EXCLUDED.status,
  updated_at = now();

-- ── Seed: Register Colyseus game server ──
INSERT INTO game_servers (name, type, url, ws_url, status, max_players, config) VALUES
  ('Grudge Lobbies (Colyseus)', 'colyseus', 'https://grudge-lobbies.colyseus.cloud', 'wss://grudge-lobbies.colyseus.cloud', 'offline', 200,
   '{"rooms": ["lobby", "island"], "authGateway": "https://auth-gateway-flax.vercel.app", "tickRate": 20}'::jsonb)
ON CONFLICT DO NOTHING;

-- ── Seed: Register connections between services ──
INSERT INTO connected_apps (app_slug, connects_to, connection_type, config) VALUES
  ('nexus-hub', 'auth-gateway', 'auth', '{"endpoints": ["/api/verify", "/api/guest"]}'::jsonb),
  ('wcs', 'auth-gateway', 'auth', '{"endpoints": ["/api/verify", "/api/login", "/api/characters"]}'::jsonb),
  ('wcs', 'objectstore', 'api', '{"endpoints": ["/api/v1/weapons.json", "/api/v1/equipment.json", "/api/v1/skills.json"]}'::jsonb),
  ('gdevelop-assistant', 'auth-gateway', 'auth', '{"endpoints": ["/api/verify"]}'::jsonb),
  ('nexus-hub', 'gruda-legion', 'websocket', '{"transport": "socket.io"}'::jsonb),
  ('grudge-platform', 'auth-gateway', 'auth', '{"endpoints": ["/api/verify", "/api/login"]}'::jsonb),
  ('nexus-hub', 'objectstore', 'api', '{"endpoints": ["/api/v1/weapons.json", "/api/v1/sprites.json"]}'::jsonb)
ON CONFLICT (app_slug, connects_to, connection_type) DO NOTHING;

-- ── View: Service health overview ──
CREATE OR REPLACE VIEW service_health_overview AS
SELECT
  sr.slug,
  sr.name,
  sr.platform,
  sr.url,
  sr.type,
  sr.status,
  sr.version,
  sr.last_health_check,
  sr.last_health_status,
  sr.tags,
  (SELECT count(*) FROM connected_apps ca WHERE ca.app_slug = sr.slug) AS outbound_connections,
  (SELECT count(*) FROM connected_apps ca WHERE ca.connects_to = sr.slug) AS inbound_connections
FROM service_registry sr
ORDER BY sr.type, sr.name;
