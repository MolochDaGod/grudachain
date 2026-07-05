const { proxyToGrudge } = require('../_grudge-proxy');

/** GET /api/auth/user — validate session and return profile (same-origin proxy). */
module.exports = async function handler(req, res) {
  return proxyToGrudge('/api/auth/user', req, res);
};