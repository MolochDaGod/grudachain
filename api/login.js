// api/login.js — Proxy to Grudge Backend (id.grudge-studio.com)
const { proxyToGrudge } = require('./_grudge-proxy');
module.exports = async (req, res) => {
  if (req.body && req.body.identifier && !req.body.username) {
    req.body.username = req.body.identifier;
  }
  return proxyToGrudge('/auth/login', req, res);
};
