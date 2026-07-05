const { proxyToGrudge } = require('../_grudge-proxy');

/** POST /api/auth/grudge-bridge — fleet SSO bridge (same-origin proxy). */
module.exports = async function handler(req, res) {
  return proxyToGrudge('/api/auth/grudge-bridge', req, res);
};