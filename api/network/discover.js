module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    nodes: [
      {
        id: 'nexus-main',
        name: 'Grudge Studio Nexus',
        status: 'active',
        services: ['ai', 'storage', 'compute', 'fleet-connect'],
        endpoint: req.headers.host ? `https://${req.headers.host}` : 'https://nexus.grudge-studio.com'
      }
    ],
    timestamp: new Date().toISOString()
  });
};
