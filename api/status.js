const { aiServices } = require('./_lib/ai-services');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    system: {
      server: 'running',
      ai: 'ready',
      network: 'connected',
      storage: 'ready',
      uptime: Date.now()
    },
    ai: aiServices,
    timestamp: new Date().toISOString()
  });
};
