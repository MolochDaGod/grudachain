const { proxyGameApi } = require('../_lib/game-api');

/**
 * GET /api/account/me → Railway /api/account (no /me route on backend).
 * Alias kept for fleet widgets and legacy clients.
 */
module.exports = function handler(req, res) {
  return proxyGameApi(req, res, '/api/account');
};