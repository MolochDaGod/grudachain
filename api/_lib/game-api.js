/**
 * Game API proxy — forwards Nexus /api/* to Postgres SSOT on Railway.
 * Edge api.grudge-studio.com may be unavailable; Railway is ONE TRUTH for game data.
 */
const { CANONICAL } = require('./canonical-urls');

const GAME_DATA_URL =
  process.env.GAME_DATA_URL ||
  process.env.GRUDGE_GAME_DATA_URL ||
  CANONICAL.gameData;

function buildCors(req) {
  const origin = (req.headers && req.headers.origin) || '';
  const allowed =
    !origin ||
    /\.grudge-studio\.com$/.test(origin) ||
    /\.grudgestudio\.com$/.test(origin) ||
    /\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Puter-Token',
    Vary: 'Origin',
  };
}

async function proxyGameApi(req, res, upstreamPath, opts = {}) {
  const cors = buildCors(req);
  Object.entries(cors).forEach(([k, v]) => {
    if (v) res.setHeader(k, v);
  });
  if (req.method === 'OPTIONS') return res.status(200).end();

  const method = opts.method || req.method;
  const base = GAME_DATA_URL.replace(/\/$/, '');
  const path = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
  const url = new URL(base + path);

  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = { Accept: 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  if (req.headers['x-puter-token']) headers['X-Puter-Token'] = req.headers['x-puter-token'];
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  const fetchOpts = { method, headers, signal: AbortSignal.timeout(15000) };

  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    let body = req.body;
    if (typeof body === 'object') body = JSON.stringify(body);
    fetchOpts.body = body;
  }

  try {
    const upstream = await fetch(url.toString(), fetchOpts);
    const ct = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status);
    res.setHeader('Content-Type', ct);
    if (ct.includes('application/json')) {
      const data = await upstream.json();
      return res.json(data);
    }
    const text = await upstream.text();
    return res.send(text);
  } catch (err) {
    console.error('[game-api-proxy]', method, path, err.message);
    return res.status(502).json({
      error: 'Game API unavailable',
      upstream: GAME_DATA_URL,
      path,
      detail: err.message,
    });
  }
}

module.exports = { GAME_DATA_URL, proxyGameApi, buildCors };