/**
 * Grudge Studio Auth Module v2.0
 * Unified authentication for all Grudge Studio apps.
 * Backend: id.grudge-studio.com (grudge-id service)
 * Stores tokens in localStorage. Supports cross-app SSO.
 */
(function () {
  'use strict';

  const AUTH_URL = 'https://id.grudge-studio.com';

  // ── LocalStorage Keys (shared across all Grudge apps) ──
  const KEYS = {
    token: 'grudge_auth_token',
    userData: 'grudge_user_data',
    characterData: 'grudge_character_data',
    userId: 'grudge_user_id',
    username: 'grudge_username',
    grudgeId: 'grudge_id',
    walletAddress: 'grudge_wallet_address',
    role: 'grudge_role'
  };

  // ── Helpers ──
  function get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch { /* quota */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }

  function getToken() { return get(KEYS.token); }

  function getUserData() {
    try {
      const raw = get(KEYS.userData);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function isLoggedIn() { return !!getToken(); }

  function isAdmin() {
    const data = getUserData();
    return data?.role === 'admin';
  }

  // ── SSO Token Pickup ──
  // On page load, check for ?sso_token= from cross-app SSO redirect
  (function pickupSsoToken() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get('sso_token');
      if (ssoToken) {
        set(KEYS.token, ssoToken);
        params.delete('sso_token');
        params.delete('sso_required');
        const clean = params.toString();
        const newUrl = window.location.pathname + (clean ? '?' + clean : '') + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    } catch { /* ignore */ }
  })();

  // ── Auth Actions ──
  async function login(username, password) {
    const res = await fetch(`${AUTH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
    _storeSession(data);
    return data;
  }

  async function register(username, password, email) {
    const res = await fetch(`${AUTH_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Registration failed');
    _storeSession(data);
    return data;
  }

  async function guestLogin() {
    const deviceId = get('grudge_device_id') || 'gb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    set('grudge_device_id', deviceId);
    const res = await fetch(`${AUTH_URL}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId })
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Guest login failed');
    _storeSession(data);
    return data;
  }

  async function verify() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${AUTH_URL}/auth/user`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) { logout(); return null; }
      const data = await res.json();
      const userData = {
        grudgeId: data.grudgeId,
        username: data.username || data.displayName,
        userId: data.id || data.grudgeId,
        role: data.role || 'player',
        walletAddress: data.walletAddress
      };
      set(KEYS.userData, userData);
      set(KEYS.username, userData.username);
      set(KEYS.grudgeId, userData.grudgeId);
      set(KEYS.role, userData.role);
      window.GRUDGE_USER = userData;
      if (typeof window._onGrudgeAuthChange === 'function') window._onGrudgeAuthChange(userData);
      return userData;
    } catch {
      return null;
    }
  }

  /** Initiate Discord OAuth */
  async function discordLogin() {
    const state = encodeURIComponent(window.location.origin + '/');
    const res = await fetch(`${AUTH_URL}/auth/discord/start?state=${state}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  /** Initiate Google OAuth */
  async function googleLogin() {
    const state = encodeURIComponent(window.location.origin + '/');
    const res = await fetch(`${AUTH_URL}/auth/google/start?state=${state}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  /** Initiate GitHub OAuth */
  async function githubLogin() {
    const state = encodeURIComponent(window.location.origin + '/');
    const res = await fetch(`${AUTH_URL}/auth/github/start?state=${state}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  /** SSO check — redirect to grudge-id to check for existing session */
  function ssoCheck() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${AUTH_URL}/auth/sso-check?return=${returnUrl}`;
  }

  function logout() {
    Object.values(KEYS).forEach(k => remove(k));
    // Also clear SSO cookie on backend
    fetch(`${AUTH_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    window.GRUDGE_USER = null;
    if (typeof window._onGrudgeAuthChange === 'function') window._onGrudgeAuthChange(null);
  }

  function _storeSession(data) {
    set(KEYS.token, data.token);
    const user = data.user || data;
    const userData = {
      grudgeId: user.grudgeId || user.grudge_id,
      username: user.username || user.displayName,
      userId: user.id || user.userId,
      role: user.role || 'player',
      walletAddress: user.walletAddress || user.serverWalletAddress
    };
    set(KEYS.userData, userData);
    set(KEYS.userId, userData.userId);
    set(KEYS.username, userData.username);
    set(KEYS.grudgeId, userData.grudgeId);
    set(KEYS.role, userData.role);
    if (userData.walletAddress) set(KEYS.walletAddress, userData.walletAddress);

    window.GRUDGE_USER = userData;
    if (typeof window._onGrudgeAuthChange === 'function') window._onGrudgeAuthChange(userData);
  }

  // ── Expose Global ──
  window.GrudgeAuth = {
    AUTH_URL,
    KEYS,
    login,
    register,
    guestLogin,
    discordLogin,
    googleLogin,
    githubLogin,
    ssoCheck,
    verify,
    logout,
    getToken,
    getUserData,
    isLoggedIn,
    isAdmin
  };

  // Populate GRUDGE_USER from stored data on load
  if (isLoggedIn()) {
    window.GRUDGE_USER = getUserData();
  }
})();
