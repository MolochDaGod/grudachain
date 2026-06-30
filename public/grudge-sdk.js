/**
 * GRUDGE SDK v2.0 — Universal Browser Client
 * Drop into ANY Grudge Studio frontend for instant auth + API + AI + storage.
 *
 * Usage:
 *   <script src="https://js.puter.com/v2/"></script>
 *   <script src="grudge-sdk.js"></script>
 *   <script>
 *     await Grudge.auth.init();               // auto-login from URL/Puter
 *     await Grudge.auth.discord();            // OAuth redirect
 *     await Grudge.auth.google();             // OAuth redirect
 *     await Grudge.auth.github();             // OAuth redirect
 *     await Grudge.auth.phantom();            // Phantom wallet
 *     const user = Grudge.auth.user();        // { grudgeId, username, email, ... }
 *     const ai = await Grudge.ai.chat('Quest for a level 5 warrior');
 *     const url = await Grudge.assets.upload(file, 'avatar.png', 'avatars');
 *   </script>
 *
 * Auth: password | guest | puter | discord | google | github | phantom/wallet
 * API  → api.grudge-studio.com
 * AI   → ai.grudge-studio.com (CF Workers AI / Anthropic fallback)
 * CDN  → assets.grudge-studio.com (R2)
 *
 * @version 2.0.0
 * @license Grudge Studio — Racalvin The Pirate King
 */

(function(global) {
  'use strict';

  const GAME_DATA  = 'https://grudge-api-production-0d46.up.railway.app';
  const API_BASE   = (typeof location !== 'undefined' &&
    (/grudachain-rho\.vercel\.app$/.test(location.hostname) ||
     /nexus\.grudge-studio\.com$/.test(location.hostname) ||
     /grudachain\.grudge-studio\.com$/.test(location.hostname)))
    ? location.origin
    : GAME_DATA;
  const AI_BASE    = 'https://ai.grudge-studio.com';
  const ASSETS_CDN = 'https://assets.grudge-studio.com';
  const WS_URL     = 'wss://api.grudge-studio.com/ws';
  // Legacy aliases
  const ID_API = API_BASE;
  const GAME_API = API_BASE;
  const TOKEN_KEY = 'grudge_token';

  let _token = null;
  let _user  = null;

  // ── Token helpers ────────────────────────────────────────────────
  function getToken() {
    return _token || sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  }
  function setToken(t) {
    _token = t;
    if (t) { sessionStorage.setItem(TOKEN_KEY, t); localStorage.setItem(TOKEN_KEY, t); }
    else   { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); }
  }
  function _authHdr() {
    const t = getToken(); return t ? { Authorization: 'Bearer ' + t } : {};
  }

  // ── HTTP helpers ────────────────────────────────────────────
  async function _post(base, path, body) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ..._authHdr() },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Request failed (' + res.status + ')');
    return d;
  }
  async function _get(base, path) {
    const res = await fetch(base + path, { headers: _authHdr() });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Request failed (' + res.status + ')');
    return d;
  }
  function _setAuth(d) { if (d.token) setToken(d.token); _user = d.user || d; return d; }
  // Legacy aliases for any existing code
  const post = (base, path, body) => _post(base, path, body);
  const get  = (base, path)       => _get(base, path);

  // ── Auth ─────────────────────────────────────────────────
  const auth = {
    /** Username + password */
    async login(username, password) {
      return _setAuth(await _post(API_BASE, '/api/auth/login', { username, password }));
    },
    /** Register new account */
    async register(username, password, email) {
      return _setAuth(await _post(API_BASE, '/api/auth/register', { username, password, email: email || undefined }));
    },
    /** Instant guest (upgradeable later) */
    async guest() {
      return _setAuth(await _post(API_BASE, '/api/auth/guest', {}));
    },
    /** Puter cloud login — links puter UUID to Grudge ID */
    async puter() {
      if (typeof puter === 'undefined' || !puter.auth) throw new Error('Puter SDK not loaded');
      await puter.auth.signIn();
      const pu = await puter.auth.getUser();
      return _setAuth(await _post(API_BASE, '/api/auth/puter', {
        puterId: pu.uuid,
        displayName: pu.username || pu.name || undefined,
      }));
    },
    /** Discord OAuth redirect */
    discord() { window.location.href = API_BASE + '/auth/discord'; },
    /** Google/Gmail OAuth redirect */
    google()  { window.location.href = API_BASE + '/auth/google'; },
    /** GitHub OAuth redirect */
    github()  { window.location.href = API_BASE + '/auth/github'; },
    /** Phantom / Solflare / Backpack — Ed25519 nonce-challenge */
    async phantom(provider, walletType) {
      const sol = provider || window.solana || window.solflare;
      if (!sol) throw new Error('No Solana wallet detected. Install Phantom or Solflare.');
      await sol.connect();
      const pubkey = sol.publicKey.toString();
      const { nonce, message } = await _get(API_BASE, '/api/auth/nonce?wallet=' + encodeURIComponent(pubkey));
      const encoded = new TextEncoder().encode(message);
      const { signature } = await sol.signMessage(encoded, 'utf8');
      return _setAuth(await _post(API_BASE, '/api/auth/wallet', {
        walletAddress: pubkey,
        signature: Array.from(signature),
        nonce,
        walletType: walletType || (window.solana && window.solana.isPhantom ? 'phantom' : 'solana'),
      }));
    },
    /** Fetch full profile from server (refreshes cache) */
    async getUser() {
      if (!getToken()) return null;
      try { const d = await _get(API_BASE, '/api/auth/user'); _user = d; return d; }
      catch { setToken(null); _user = null; return null; }
    },
    user()      { return _user; },
    grudgeId()  { return _user && _user.grudgeId || null; },
    isLoggedIn(){ return !!getToken(); },
    token()     { return getToken(); },
    async logout() {
      try { await _post(API_BASE, '/api/auth/logout', {}); } catch {}
      setToken(null); _user = null;
    },
    /** Call on page load — picks up ?token= from OAuth callbacks, tries Puter auto-login */
    async init() {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token') || params.get('sso_token');
      if (t) {
        setToken(t);
        const u = new URL(window.location.href);
        u.searchParams.delete('token'); u.searchParams.delete('sso_token'); u.searchParams.delete('provider');
        window.history.replaceState({}, '', u.pathname + (u.search || ''));
      }
      if (getToken()) {
        try { await auth.getUser(); return true; } catch { return false; }
      }
      try {
        if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn()) {
          const pu = await puter.auth.getUser();
          if (pu) { await auth.puter(); return true; }
        }
      } catch {}
      return false;
    },
  };

  // ── Wallet management ───────────────────────────────────────
  const wallet = {
    all()              { return _get(API_BASE, '/api/wallet/all'); },
    get()              { return _get(API_BASE, '/api/wallet'); },
    create()           { return _post(API_BASE, '/api/wallet/create', {}); },
    link(addr, type)   { return _post(API_BASE, '/api/wallet/link', { walletAddress: addr, walletType: type || 'phantom' }); },
  };

  // ── Assets (R2 via ALE Worker) ──────────────────────────────
  const assets = {
    /** Upload file to R2, returns public CDN URL */
    async upload(file, filename, category) {
      const grudgeId = (_user && _user.grudgeId) || 'guest';
      const meta = await _post(AI_BASE, '/assets/upload', {
        filename: filename || (file && file.name) || 'upload',
        category: category || 'general', grudgeId,
      });
      await fetch(meta.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': meta.contentType || (file && file.type) || 'application/octet-stream' },
        body: file,
      });
      return meta.publicUrl;
    },
    list(category) {
      const grudgeId = (_user && _user.grudgeId) || 'guest';
      return _get(AI_BASE, '/assets/list?prefix=players/' + grudgeId + (category ? '/' + category : ''));
    },
  };

  // ── Cloud Sync (DB + Puter KV) ──────────────────────────────
  const sync = {
    async push(gameState, islandId) {
      const hdrs = { 'Content-Type': 'application/json', ..._authHdr() };
      try {
        if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn && puter.auth.isSignedIn()) {
          const pt = puter.authToken || (puter.auth && puter.auth.token);
          if (pt) hdrs['X-Puter-Token'] = pt;
        }
      } catch {}
      const res = await fetch(API_BASE + '/api/studio/sync/push', {
        method: 'POST', headers: hdrs, body: JSON.stringify({ gameState, islandId }),
      });
      return res.json();
    },
    async pull() {
      const hdrs = _authHdr();
      try {
        if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn && puter.auth.isSignedIn()) {
          const pt = puter.authToken || (puter.auth && puter.auth.token);
          if (pt) hdrs['X-Puter-Token'] = pt;
        }
      } catch {}
      const res = await fetch(API_BASE + '/api/studio/sync/pull', { headers: hdrs });
      return res.json();
    },
    status() { return _get(API_BASE, '/api/studio/sync/status'); },
  };

  // ── Game API ────────────────────────────────────────────
  const api = {
    get(path)       { return _get(API_BASE, path); },
    post(path, body){ return _post(API_BASE, path, body); },
    characters()    { return _get(API_BASE, '/api/characters'); },
    createChar(d)   { return _post(API_BASE, '/api/characters', d); },
    account()       { return _get(API_BASE, API_BASE === GAME_DATA ? '/api/account' : '/api/account/me'); },
    islands()       { return _get(API_BASE, '/api/islands'); },
    profile()       { return _get(API_BASE, '/api/profile'); },
    metadata()      { return _get(API_BASE, '/api/metadata'); },
    health()        { return _get(API_BASE, '/api/health'); },
  };
  // Legacy alias
  const account = { profile() { return _get(API_BASE, '/api/profile'); } };
  // ── AI (CF Workers AI → Puter → Anthropic fallback) ──────────────
  const ai = {
    async chat(message, opts) {
      // 1. CF Workers AI (free, no key needed)
      try {
        const d = await _post(AI_BASE, '/ai/cf', { message, model: opts && opts.model || '@cf/meta/llama-3-8b-instruct' });
        if (d.response) return d.response;
      } catch {}
      // 2. Puter.js (free — user's own account)
      if (typeof puter !== 'undefined' && puter.ai) {
        try {
          const r = await puter.ai.chat(message, opts || {});
          return typeof r === 'string' ? r : (r && r.message && r.message.content || r && r.toString() || '');
        } catch {}
      }
      // 3. Anthropic via backend
      try {
        const d = await _post(AI_BASE, '/ai/chat', { message });
        return d.response || d.content || '';
      } catch (e) { return 'AI unavailable: ' + e.message; }
    },
    cf(message, model) {
      return _post(AI_BASE, '/ai/cf', { message, model: model || '@cf/meta/llama-3-8b-instruct' });
    },
    async *stream(message, opts) {
      if (typeof puter !== 'undefined' && puter.ai) {
        const resp = await puter.ai.chat(message, Object.assign({}, opts, { stream: true }));
        for await (const part of resp) { if (part && part.text) yield part.text; }
      }
    },
    async image(prompt) {
      if (typeof puter !== 'undefined' && puter.ai) return puter.ai.txt2img(prompt);
      throw new Error('Puter SDK required for image generation');
    },
  };

  // ── Puter KV cloud storage ───────────────────────────────────
  const cloud = {
    async save(key, value) {
      if (typeof puter !== 'undefined' && puter.kv) {
        await puter.kv.set('grudge_' + key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      }
      return false;
    },
    async load(key) {
      if (typeof puter !== 'undefined' && puter.kv) {
        const v = await puter.kv.get('grudge_' + key);
        try { return JSON.parse(v); } catch { return v; }
      }
      return null;
    },
    async saveFile(name, data) {
      if (typeof puter !== 'undefined' && puter.fs)
        return puter.fs.write('grudge-studio/' + name, data, { createMissingParents: true });
      throw new Error('Puter SDK required for cloud file storage');
    },
  };

  const config = { API_BASE, AI_BASE, ASSETS_CDN, WS_URL };

  global.Grudge = { auth, wallet, api, account, sync, assets, ai, cloud, config };

})(typeof window !== 'undefined' ? window : globalThis);

})(typeof window !== 'undefined' ? window : globalThis);
