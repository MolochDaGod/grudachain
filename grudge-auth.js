/**
 * grudge-auth.js — Grudge ID client (canonical)
 * Identity provider: https://id.grudge-studio.com
 *
 * All Grudge Studio apps should use the same Grudge ID login page — never
 * embed a separate login form. Redirect users to AUTH_PAGE instead.
 */
const GRUDGE_GATEWAY_URL = 'https://id.grudge-studio.com';
const GRUDGE_AUTH_PAGE = GRUDGE_GATEWAY_URL + '/api/auth/page';
const GRUDGE_AUTH_BASE = GRUDGE_GATEWAY_URL + '/api/auth';
const TOKEN_KEY = 'grudge_auth_token';

const GrudgeAuth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  },
  setToken(t) {
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      sessionStorage.setItem(TOKEN_KEY, t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  },
  isLoggedIn() { return !!this.getToken(); },
  headers() {
    const t = this.getToken();
    return t
      ? { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  },
  redirectToLogin(returnUrl) {
    const ret = encodeURIComponent(returnUrl || window.location.href.split('#')[0]);
    window.location.href = GRUDGE_AUTH_PAGE + '?redirect=' + ret + '&app=nexus';
  },
  async getUserData() {
    const t = this.getToken();
    if (!t) return null;
    const r = await fetch(GRUDGE_AUTH_BASE + '/user', { headers: { Authorization: 'Bearer ' + t } });
    if (!r.ok) { this.setToken(null); return null; }
    return r.json();
  },
  logout() {
    const t = this.getToken();
    if (t) {
      fetch(GRUDGE_AUTH_BASE + '/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t },
      }).catch(function () {});
    }
    this.setToken(null);
    ['grudge_user_id', 'grudge_id', 'grudge_username', 'grudge_auth_provider'].forEach(function (k) {
      localStorage.removeItem(k);
    });
  },
};

function getGrudgeToken() { return GrudgeAuth.getToken(); }
function isGrudgeAuthenticated() { return GrudgeAuth.isLoggedIn(); }
function grudgeSignOut() { GrudgeAuth.logout(); }
function grudgeAuthHeaders() { return GrudgeAuth.headers(); }
function redirectToGrudgeGateway(r) { GrudgeAuth.redirectToLogin(r); }