/** Fleet URL audit — finds canonical vs live config mismatches */

const CANONICAL = {
  nexus: 'https://grudachain.grudge-studio.com',
  auth: 'https://id.grudge-studio.com',
  authLogin: 'https://id.grudge-studio.com/api/auth/page',
  gameApi: 'https://api.grudge-studio.com',
  warlords: 'https://client.grudge-studio.com',
  puterCloud: 'https://grudge-studio.puter.site',
  grudgedot: 'https://gdevelop-assistant.vercel.app',
  releasesHub: 'https://launcher.grudge-studio.com',
  legion: 'https://ai.grudge-studio.com',
  grudaAgent: 'https://grudaagent.vercel.app',
  objectStore: 'https://objectstore.grudge-studio.com',
  assets: 'https://assets.grudge-studio.com',
  islandHub: 'https://warlord-crafting-suite.vercel.app/island-hub',
  ale: 'https://ale.grudge-studio.com'
};

const LEGACY_AUTH_PATTERNS = [
  '/auth?app=',
  '/auth?redirect=',
  'id.grudge-studio.com/auth/',
  'id.grudge-studio.com/auth"'
];

const STALE_HOSTS = [
  'grudachain-rho.vercel.app',
  'grudachain.grudgestudio.com',
  'grudachain.vercel.app',
  'molochdagod.github.io/ObjectStore',
  'grudgewarlords.com'
];

async function fetchJson(url, timeoutMs = 8000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch (err) {
    return { ok: false, status: 0, error: err.message, data: null };
  }
}

function collectUrls(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v);
    else if (typeof v === 'object') collectUrls(v, out);
  }
  return out;
}

function findStale(urls) {
  return urls.filter(u => STALE_HOSTS.some(s => u.includes(s)));
}

function diffKey(key, expected, found) {
  if (!found) return null;
  const norm = (s) => String(s || '').replace(/\/$/, '');
  if (norm(expected) === norm(found)) return null;
  return { key, expected, found, severity: 'mismatch' };
}

async function runFleetMismatchAudit(origin = 'https://grudachain.grudge-studio.com') {
  const base = origin.replace(/\/$/, '');
  const [connectR, configR, linksR] = await Promise.all([
    fetchJson(`${base}/api/fleet/connect`),
    fetchJson(`${base}/api/grudge-studio/config`),
    fetchJson(`${base}/api/grudge-studio/links`)
  ]);

  const issues = [];
  const checks = [];

  if (connectR.ok && connectR.data) {
    const c = connectR.data;
    const diffs = [
      diffKey('nexus', CANONICAL.nexus, c.tools?.nexus),
      diffKey('auth', CANONICAL.auth, c.auth?.gateway),
      diffKey('gameApi', CANONICAL.gameApi, c.api?.game),
      diffKey('puterCloud', CANONICAL.puterCloud, c.cloud?.puter),
      diffKey('grudgedot', CANONICAL.grudgedot, c.tools?.grudgedot)
    ].filter(Boolean);
    issues.push(...diffs);

    const stale = findStale(collectUrls(c));
    stale.forEach(url => issues.push({ key: 'stale_url', found: url, severity: 'stale' }));

    if (c.auth?.login && !String(c.auth.login).includes('/api/auth/page')) {
      issues.push({
        key: 'legacy_auth_login',
        expected: CANONICAL.authLogin,
        found: c.auth.login,
        severity: 'mismatch'
      });
    }

    const allUrls = collectUrls(c).join(' ');
    LEGACY_AUTH_PATTERNS.forEach((pat) => {
      if (allUrls.includes(pat)) {
        issues.push({
          key: 'legacy_auth_path',
          found: pat,
          expected: '/api/auth/page',
          severity: 'legacy'
        });
      }
    });

    if (c.libraries?.gameLibrary && !c.libraries.gameLibrary.canonical) {
      issues.push({
        key: 'gameLibrary_not_canonical',
        found: c.libraries.gameLibrary.url,
        severity: 'config'
      });
    }

    checks.push({ source: 'fleet/connect', ok: true, issueCount: diffs.length + stale.length });
  } else {
    checks.push({ source: 'fleet/connect', ok: false, error: connectR.error || connectR.status });
  }

  if (configR.ok && configR.data?.ecosystem) {
    const e = configR.data.ecosystem;
    const diffs = [
      diffKey('nexus', CANONICAL.nexus, e.nexus),
      diffKey('warlords', CANONICAL.warlords, e.grudgewarlords),
      diffKey('objectStore', CANONICAL.objectStore, e.objectStore)
    ].filter(Boolean);
    issues.push(...diffs);
    issues.push(...findStale(collectUrls(e)).map(url => ({ key: 'stale_url', found: url, severity: 'stale' })));
    checks.push({ source: 'grudge-studio/config', ok: true, issueCount: diffs.length });
  } else {
    checks.push({ source: 'grudge-studio/config', ok: false, error: configR.error || configR.status });
  }

  if (linksR.ok && linksR.data?.links) {
    const l = linksR.data.links;
    const diffs = [
      diffKey('nexus', CANONICAL.nexus, l.nexus),
      diffKey('main', CANONICAL.warlords, l.main)
    ].filter(Boolean);
    issues.push(...diffs);
    checks.push({ source: 'grudge-studio/links', ok: true, issueCount: diffs.length });
  }

  const puterProbe = await fetchJson('https://grudge-studio.puter.site/', 6000);
  checks.push({
    source: 'puter-cloud',
    ok: puterProbe.ok,
    status: puterProbe.status,
    note: puterProbe.ok ? 'grudge-studio.puter.site reachable' : 'Puter dashboard unreachable or CORS blocked server-side'
  });

  const uniqueIssues = [];
  const seen = new Set();
  for (const i of issues) {
    const sig = `${i.key}:${i.found || i.expected}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    uniqueIssues.push(i);
  }

  return {
    success: true,
    canonical: CANONICAL,
    checks,
    issues: uniqueIssues,
    issueCount: uniqueIssues.length,
    healthy: uniqueIssues.length === 0,
    timestamp: new Date().toISOString()
  };
}

module.exports = { CANONICAL, runFleetMismatchAudit };