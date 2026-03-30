// api/oauth-google-callback.js — Proxy to Grudge Backend (id.grudge-studio.com)
const { proxyToGrudge } = require('./_grudge-proxy');
module.exports = async (req, res) => proxyToGrudge('/auth/google/callback', req, res, { passQuery: true });
