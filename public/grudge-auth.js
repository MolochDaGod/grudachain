/**
 * Grudge Studio Auth Module
 * Client-side authentication for the Nexus hub.
 * Talks to auth-gateway-flax.vercel.app for login/register/guest/verify.
 * Stores tokens in localStorage using the same keys as WCS crossAppAuth.
 */
(function () {
  'use strict';

  const AUTH_GATEWAY = 'https://auth-gateway-flax.vercel.app';

  // ── LocalStorage Keys (shared with WCS crossAppAuth) ──
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

  // ── Auth Actions ──
  async function login(username, password) {
    const res = await fetch(`${AUTH_GATEWAY}/api/login`, {
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
    const res = await fetch(`${AUTH_GATEWAY}/api/register`, {
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
    const res = await fetch(`${AUTH_GATEWAY}/api/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
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
      const res = await fetch(`${AUTH_GATEWAY}/api/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { logout(); return null; }
      const data = await res.json();
      if (!data.success) { logout(); return null; }
      // Refresh stored user data
      const userData = {
        grudgeId: data.grudgeId,
        username: data.username || data.user?.username,
        userId: data.user?.id || data.grudgeId,
        role: data.user?.role || 'player'
      };
      set(KEYS.userData, userData);
      set(KEYS.username, userData.username);
      set(KEYS.grudgeId, userData.grudgeId);
      set(KEYS.role, userData.role);
      return userData;
    } catch {
      return null; // gateway unreachable, keep session
    }
  }

  function logout() {
    Object.values(KEYS).forEach(k => remove(k));
    window.GRUDGE_USER = null;
    if (typeof window._onGrudgeAuthChange === 'function') window._onGrudgeAuthChange(null);
  }

  function _storeSession(data) {
    set(KEYS.token, data.token);
    const user = data.user || data;
    const userData = {
      grudgeId: user.grudgeId || user.grudge_id,
      username: user.username,
      userId: user.id || user.userId,
      role: user.role || 'player',
      walletAddress: user.walletAddress
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
    AUTH_GATEWAY,
    KEYS,
    login,
    register,
    guestLogin,
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
