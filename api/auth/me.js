const { proxyToGrudge } = require('../_grudge-proxy');

/** GET /api/auth/me — full user profile from JWT (same-origin proxy). */
module.exports = async function handler(req, res) {
  return proxyToGrudge('/api/auth/me', req, res);
};