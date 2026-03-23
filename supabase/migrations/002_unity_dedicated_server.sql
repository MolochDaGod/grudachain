-- ============================================
-- Grudge Studio: Register Unity Dedicated Game Server
-- Adds the headless Unity server to service_registry and game_servers
-- ============================================

-- Register Unity Dedicated Server in service_registry
INSERT INTO service_registry (slug, name, platform, url, health_endpoint, type, status, repo_url, branch, tags) VALUES
  ('unity-dedicated', 'Grudge Warlords Dedicated Server', 'vps', 'https://grudgewarlords.com', '/api/servers/unity/status', 'game-server', 'active',
   'https://github.com/MolochDaGod/GrudgeWars', 'main', ARRAY['unity','game-server','dedicated','headless'])
ON CONFLICT (slug) DO UPDATE SET
  url = EXCLUDED.url,
  health_endpoint = EXCLUDED.health_endpoint,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  updated_at = now();

-- Register Unity Dedicated Server in game_servers
INSERT INTO game_servers (name, type, url, ws_url, status, max_players, config) VALUES
  ('Grudge Warlords Dedicated (Unity)', 'dedicated', 'https://grudgewarlords.com', NULL, 'online', 100,
   '{"port": 7777, "tickRate": 30, "region": "us-east-1", "healthEndpoint": "/api/servers/unity/status", "heartbeatEndpoint": "/api/servers/unity/heartbeat", "protocol": "tcp+udp"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Connect Unity server to auth gateway
INSERT INTO connected_apps (app_slug, connects_to, connection_type, config) VALUES
  ('unity-dedicated', 'auth-gateway', 'auth', '{"endpoints": ["/api/verify"], "note": "Unity server validates player JWT on connect"}'::jsonb)
ON CONFLICT (app_slug, connects_to, connection_type) DO NOTHING;

-- Connect Unity server to game API
INSERT INTO connected_apps (app_slug, connects_to, connection_type, config) VALUES
  ('unity-dedicated', 'nexus-hub', 'api', '{"endpoints": ["/api/servers/unity/heartbeat", "/api/servers/unity/status", "/api/servers"], "note": "Heartbeat + server listing"}'::jsonb)
ON CONFLICT (app_slug, connects_to, connection_type) DO NOTHING;
