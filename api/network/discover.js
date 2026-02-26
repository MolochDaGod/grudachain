module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    nodes: [
      {
        id: 'grudachain-main',
        name: 'GrudaChain Node',
        status: 'active',
        services: ['ai', 'storage', 'compute'],
        endpoint: req.headers.host ? `https://${req.headers.host}` : 'https://grudachain.vercel.app'
      }
    ],
    timestamp: new Date().toISOString()
  });
};
