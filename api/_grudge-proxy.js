// api/_grudge-proxy.js
// Shared proxy helper — forwards auth requests to the canonical Grudge backend (VPS)
// All auth logic lives at id.grudge-studio.com
// Prefixed with _ so Vercel won't expose it as a route

const GRUDGE_ID_URL = process.env.GRUDGE_AUTH_URL || process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';

const ALLOWED_ORIGINS = [
  'https://grudachain.grudgestudio.com',
  'https://grudachain-rho.vercel.app',
  'https://grudge-studio.com',
  'https://www.grudge-studio.com',
  'https://grudgewarlords.com',
  'https://www.grudgewarlords.com',
  'https://grudge-platform.vercel.app',
  'https://grudge-warlords-game.vercel.app',
  'https://warlord-crafting-suite.vercel.app',
  'https://gdevelop-assistant.vercel.app',
  'https://id.grudge-studio.com',
  'https://api.grudge-studio.com',
  'https://dash.grudge-studio.com',
  'https://account.grudge-studio.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
];

function buildCorsHeaders(req) {
  const origin = (req && req.headers && req.headers.origin) || '';
  // Also allow any *.vercel.app or *.grudge-studio.com origin
  const isAllowed = ALLOWED_ORIGINS.includes(origin)
    || /\.vercel\.app$/.test(origin)
    || /\.grudge-studio\.com$/.test(origin)
    || /\.grudgestudio\.com$/.test(origin)
    || /^http:\/\/localhost/.test(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

/**
 * Proxy a request to the Grudge ID backend.
 * @param {string} path - Backend path, e.g. '/auth/login'
 * @param {object} req  - Vercel request object
 * @param {object} res  - Vercel response object
 * @param {object} [opts] - Extra options
 * @param {string} [opts.method] - Override HTTP method
 * @param {boolean} [opts.passQuery] - Forward query params (for GET redirects)
 */
async function proxyToGrudge(path, req, res, opts = {}) {
  const CORS_HEADERS = buildCorsHeaders(req);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => { if (v) res.setHeader(k, v); });
  if (req.method === 'OPTIONS') return res.status(200).end();

  const method = opts.method || req.method;
  const url = new URL(path, GRUDGE_ID_URL);

  if (opts.passQuery && req.query) {
    Object.entries(req.query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown';
  headers['X-Forwarded-For'] = clientIp;
  headers['X-Real-IP'] = clientIp;
  if (req.headers['user-agent']) {
    headers['User-Agent'] = req.headers['user-agent'];
  }

  const fetchOpts = { method, headers, redirect: 'manual' };

  if (method !== 'GET' && method !== 'HEAD') {
    let body = req.body;
    if (typeof body === 'object') body = JSON.stringify(body);
    fetchOpts.body = body;
  }

  fetchOpts.signal = AbortSignal.timeout(12000);

  try {
    const upstream = await fetch(url.toString(), fetchOpts);

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (location) return res.redirect(upstream.status, location);
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    const text = await upstream.text();
    res.status(upstream.status);
    if (contentType) res.setHeader('Content-Type', contentType);
    return res.send(text);
  } catch (err) {
    console.error(`[proxy] ${method} ${path} failed:`, err.message);
    return res.status(502).json({
      error: 'Backend unavailable',
      detail: 'Could not reach id.grudge-studio.com',
    });
  }
}

module.exports = { proxyToGrudge, GRUDGE_ID_URL, ALLOWED_ORIGINS, buildCorsHeaders };
