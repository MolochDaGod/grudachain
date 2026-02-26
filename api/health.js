const { aiServices } = require('./_lib/ai-services');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    status: 'healthy',
    services: aiServices,
    system: {
      server: 'running',
      ai: 'ready',
      network: 'connected',
      storage: 'ready'
    },
    timestamp: new Date().toISOString()
  });
};
