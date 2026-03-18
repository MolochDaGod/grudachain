const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const servers = [];

  // Probe Colyseus server if deployed
  const colyseusUrl = process.env.COLYSEUS_SERVER_URL || null;
  if (colyseusUrl) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const r = await _fetch(`${colyseusUrl}/health`, { signal: controller.signal });
      const data = await r.json().catch(() => ({}));
      servers.push({ name: 'Grudge Lobbies (Colyseus)', type: 'colyseus', url: colyseusUrl, status: r.ok ? 'online' : 'offline', rooms: data.rooms || ['lobby', 'island'], data });
    } catch (e) {
      servers.push({ name: 'Grudge Lobbies (Colyseus)', type: 'colyseus', url: colyseusUrl, status: 'offline', error: e.message });
    }
  } else {
    servers.push({ name: 'Grudge Lobbies (Colyseus)', type: 'colyseus', url: null, status: 'not-deployed', rooms: ['lobby', 'island'], note: 'Set COLYSEUS_SERVER_URL env var when deployed' });
  }

  // Probe Grudge Game API
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const r = await _fetch('https://api.grudge-studio.com/health', { signal: controller.signal });
    const data = await r.json().catch(() => ({}));
    servers.push({ name: 'Grudge Game API', type: 'rest', url: 'https://api.grudge-studio.com', status: r.ok ? 'online' : 'offline', data });
  } catch (e) {
    servers.push({ name: 'Grudge Game API', type: 'rest', url: 'https://api.grudge-studio.com', status: 'offline', error: e.message });
  }

  // Read from Supabase if available
  const supabase = getSupabase();
  let dbServers = [];
  if (supabase) {
    try {
      const { data } = await supabase.from('game_servers').select('*');
      if (data) dbServers = data;
    } catch { /* noop */ }
  }

  // Colyseus room schema info
  const roomTypes = [
    { type: 'lobby', displayName: 'Lobby', maxClients: 20, authRequired: false, description: 'Waiting room for matchmaking and social chat' },
    { type: 'island', displayName: 'Island', maxClients: 50, authRequired: false, description: 'Open-world island instance with day/night cycle' }
  ];

  res.json({
    success: true,
    servers,
    dbServers,
    roomTypes,
    colyseus: {
      schema: {
        PlayerState: { fields: ['sessionId', 'grudgeId', 'username', 'role', 'characterClass', 'race', 'faction', 'level', 'health', 'maxHealth', 'position', 'rotation', 'isReady'] },
        LobbyState: { fields: ['players', 'phase', 'countdown', 'maxPlayers'] },
        IslandState: { fields: ['players', 'islandId', 'islandName', 'biome', 'timeOfDay', 'weather'] }
      },
      auth: 'Bearer token via id.grudge-studio.com/auth/verify',
      clientPackage: 'colyseus.js@0.15.x'
    },
    timestamp: new Date().toISOString()
  });
};
