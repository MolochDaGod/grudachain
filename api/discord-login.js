// api/discord-login.js — Proxy to Grudge Backend (id.grudge-studio.com)
const { proxyToGrudge } = require('./_grudge-proxy');
module.exports = async (req, res) => proxyToGrudge('/auth/discord', req, res, { passQuery: true });
