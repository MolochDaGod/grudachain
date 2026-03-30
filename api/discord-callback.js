// api/discord-callback.js — Proxy to Grudge Backend (id.grudge-studio.com)
const { proxyToGrudge } = require('./_grudge-proxy');
module.exports = async (req, res) => proxyToGrudge('/auth/discord/callback', req, res, { passQuery: true });
