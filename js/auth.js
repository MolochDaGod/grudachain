/**
 * GrudaChain Hub - Auth Module
 * Handles login/register/guest via auth.grudgestudio.com
 */

const AUTH_BASE = 'https://auth.grudgestudio.com/api';
const TOKEN_KEY = 'grudge_auth_token';
const USER_KEY = 'grudge_user';

export class AuthManager {
  constructor() {
    this.user = null;
    this.token = null;
    this.onAuthChange = null; // callback
  }

  /** Initialize - check for existing session */
  async init() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try { this.user = JSON.parse(cached); } catch { /* ignore */ }
    }

    if (this.token) {
      try {
        const verified = await this.verify();
        if (!verified) this.clearSession();
      } catch {
        // Token might be expired - keep cached user for offline display
      }
    }

    this._notifyChange();
  }

  /** Login with username/password */
  async login(username, password) {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    this._saveSession(data.token, {
      id: data.userId,
      grudgeId: data.grudgeId,
      username: data.username,
      displayName: data.displayName,
      isPremium: data.isPremium,
      walletAddress: data.walletAddress,
      gold: data.gold || 0,
      gbuxBalance: data.gbuxBalance || 0,
      isGuest: false
    });

    // Fetch full profile
    await this.verify();
    return this.user;
  }

  /** Register new account */
  async register(username, email, password) {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    this._saveSession(data.token, {
      id: data.userId,
      grudgeId: data.grudgeId,
      username: data.username,
      displayName: data.displayName,
      walletAddress: data.walletAddress,
      crossmintEmail: data.crossmintEmail,
      gold: 1000,
      gbuxBalance: 0,
      isGuest: false
    });

    await this.verify();
    return this.user;
  }

  /** Guest login */
  async guest() {
    const deviceId = this._getDeviceId();
    const res = await fetch(`${AUTH_BASE}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Guest login failed');

    this._saveSession(data.token, {
      id: data.userId,
      grudgeId: data.grudgeId,
      username: data.username,
      displayName: data.displayName,
      isGuest: true,
      gold: 500,
      gbuxBalance: 0
    });

    return this.user;
  }

  /** Verify token and get full profile */
  async verify() {
    if (!this.token) return false;

    const res = await fetch(`${AUTH_BASE}/verify`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.success) return false;

    this.user = {
      id: data.user.id,
      grudgeId: data.user.grudgeId,
      username: data.user.username,
      displayName: data.user.displayName,
      email: data.user.email,
      role: data.user.role,
      isPremium: data.user.isPremium,
      avatarUrl: data.user.avatarUrl,
      walletAddress: data.user.walletAddress,
      hasPuter: data.user.hasPuter,
      hasDiscord: data.user.hasDiscord,
      hasWallet: data.user.hasWallet,
      linkedMethods: data.user.linkedMethods || [],
      gold: data.user.gold || 0,
      gbuxBalance: data.user.gbuxBalance || 0,
      accountXp: data.user.accountXp || 0,
      createdAt: data.user.createdAt,
      isGuest: (data.user.username || '').startsWith('guest_')
    };

    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this._notifyChange();
    return true;
  }

  /** Logout */
  logout() {
    this.clearSession();
    this._notifyChange();
  }

  /** Check if authenticated */
  get isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /** Get display name */
  get displayName() {
    if (!this.user) return 'Guest';
    return this.user.displayName || this.user.username || 'User';
  }

  /** Get role display */
  get roleDisplay() {
    if (!this.user) return 'Not signed in';
    return this.user.role || (this.user.isGuest ? 'guest' : 'user');
  }

  /** Get avatar initial */
  get avatarInitial() {
    return (this.displayName || 'G')[0].toUpperCase();
  }

  /** Check auth gateway health */
  async checkHealth() {
    try {
      const res = await fetch(`${AUTH_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        return { online: true, version: data.version || 'unknown' };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  }

  // --- Private ---

  _saveSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._notifyChange();
  }

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  _notifyChange() {
    if (this.onAuthChange) this.onAuthChange(this.user);
  }

  _getDeviceId() {
    let id = localStorage.getItem('grudge_device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : 
           'xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
      localStorage.setItem('grudge_device_id', id);
    }
    return id;
  }
}
