// api/guest.js — Proxy to Grudge Backend (id.grudge-studio.com)
const { proxyToGrudge } = require('./_grudge-proxy');
module.exports = async (req, res) => proxyToGrudge('/api/auth/guest', req, res);
