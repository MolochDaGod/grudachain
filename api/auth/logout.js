const { proxyToGrudge } = require('../_grudge-proxy');

/** POST /api/auth/logout — end session (same-origin proxy). */
module.exports = async function handler(req, res) {
  return proxyToGrudge('/api/auth/logout', req, res);
};