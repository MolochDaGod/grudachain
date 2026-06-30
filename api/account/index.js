const { proxyGameApi } = require('../_lib/game-api');

/** GET/PATCH /api/account → Railway game data */
module.exports = function handler(req, res) {
  return proxyGameApi(req, res, '/api/account');
};