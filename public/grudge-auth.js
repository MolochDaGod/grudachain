/** grudge-auth.js — Grudge Auth Gateway v2
 * Auth API: https://id.grudge-studio.com (CNAME -> api.grudge-studio.com)
 * Endpoints: POST /api/auth/login | register | guest | puter | logout
 *            GET  /api/auth/user | verify
 */
const GRUDGE_GATEWAY_URL = 'https://api.grudge-studio.com';
const GRUDGE_AUTH_BASE = GRUDGE_GATEWAY_URL + '/api/auth';

const GrudgeAuth = {
  getToken() { return sessionStorage.getItem('grudge_token') || localStorage.getItem('grudge_token') || null; },
  setToken(t) {
    if (t) { sessionStorage.setItem('grudge_token', t); localStorage.setItem('grudge_token', t); }
    else { sessionStorage.removeItem('grudge_token'); localStorage.removeItem('grudge_token'); }
  },
  isLoggedIn() { return !!this.getToken(); },
  headers() {
    const t = this.getToken();
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  },
  async login(username, password) {
    const r = await fetch(`${GRUDGE_AUTH_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Login failed');
    this.setToken(d.token); return d;
  },
  async register(username, password, email) {
    const r = await fetch(`${GRUDGE_AUTH_BASE}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, email }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Register failed');
    this.setToken(d.token); return d;
  },
  async guestLogin() {
    const r = await fetch(`${GRUDGE_AUTH_BASE}/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Guest login failed');
    this.setToken(d.token); return d;
  },
  async verify() {
    const t = this.getToken(); if (!t) return null;
    const r = await fetch(`${GRUDGE_AUTH_BASE}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) });
    const d = await r.json(); if (!r.ok || !d.valid) { this.setToken(null); return null; }
    return d.user;
  },
  async getUserData() {
    const t = this.getToken(); if (!t) return null;
    const r = await fetch(`${GRUDGE_AUTH_BASE}/user`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) { this.setToken(null); return null; }
    return r.json();
  },
  logout() { this.setToken(null); }
};

// Legacy shim — keeps old code using plain functions working
function getGrudgeToken() { return GrudgeAuth.getToken(); }
function isGrudgeAuthenticated() { return GrudgeAuth.isLoggedIn(); }
function grudgeSignOut() { GrudgeAuth.logout(); }
function grudgeAuthHeaders() { return GrudgeAuth.headers(); }
