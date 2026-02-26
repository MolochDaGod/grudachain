module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Server-side storage metadata — actual cloud storage runs client-side via Puter.js
  // This endpoint provides the default bucket structure and storage config
  const storageConfig = {
    provider: 'puter',
    root: 'grudge-studio',
    buckets: [
      { name: 'assets', description: 'Game assets (textures, models, sounds)' },
      { name: 'configs', description: 'Configuration files and settings' },
      { name: 'game-data', description: 'Game world data and level definitions' },
      { name: 'player-data', description: 'Player profiles and save data' },
      { name: 'exports', description: 'Exported builds and packages' },
      { name: 'backups', description: 'Automated and manual backups' }
    ],
    features: {
      cloudFS: 'puter.fs — Unlimited cloud file storage',
      kvStore: 'puter.kv — Key-value database',
      hosting: 'puter.hosting — Deploy to *.puter.site',
      auth: 'puter.auth — User authentication',
      ai: 'puter.ai — Free unlimited AI (Claude, GPT-4o, Gemini)'
    },
    instructions: 'Sign in to Puter via the dashboard to access cloud storage. All storage operations run client-side through the Puter.js SDK — no API keys needed.'
  };

  res.json({
    success: true,
    storage: storageConfig,
    timestamp: new Date().toISOString()
  });
};
