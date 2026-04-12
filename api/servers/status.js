const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

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

  // Probe Unity Dedicated Server (via Node.js API proxy)
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const r = await _fetch('https://grudgewarlords.com/api/servers/unity/status', { signal: controller.signal });
    const data = await r.json().catch(() => ({}));
    const isOnline = r.ok && data.status === 'online';
    servers.push({
      name: 'Grudge Warlords Dedicated (Unity)',
      type: 'dedicated',
      url: 'https://grudgewarlords.com',
      port: data.port || 7777,
      status: isOnline ? 'online' : (data.status || 'offline'),
      maxPlayers: data.maxPlayers || 100,
      currentPlayers: data.currentPlayers || 0,
      tickRate: data.tickRate || 30,
      region: data.region || 'us-east-1',
      data
    });
  } catch (e) {
    servers.push({ name: 'Grudge Warlords Dedicated (Unity)', type: 'dedicated', url: 'https://grudgewarlords.com', port: 7777, status: 'offline', error: e.message });
  }

  // Colyseus room schema info
  const roomTypes = [
    { type: 'lobby', displayName: 'Lobby', maxClients: 20, authRequired: false, description: 'Waiting room for matchmaking and social chat' },
    { type: 'island', displayName: 'Island', maxClients: 50, authRequired: false, description: 'Open-world island instance with day/night cycle' }
  ];

  res.json({
    success: true,
    servers,
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
