const { proxyGameApi } = require('./_lib/game-api');

/** GET/POST /api/characters → Railway game data SSOT */
module.exports = function handler(req, res) {
  return proxyGameApi(req, res, '/api/characters');
};