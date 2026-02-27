const { aiServices } = require('./_lib/ai-services');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
