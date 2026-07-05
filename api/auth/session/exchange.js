const { proxyToGrudge } = require('../../_grudge-proxy');

/** POST /api/auth/session/exchange — bridge launch token → session JWT (same-origin proxy). */
module.exports = async function handler(req, res) {
  return proxyToGrudge('/api/auth/session/exchange', req, res);
};