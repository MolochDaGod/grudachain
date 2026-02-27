/**
 * GrudaChain Hub - Main Application
 * Entry point that wires all modules together
 */

import { AuthManager } from './auth.js';
import { PanelRenderer } from './panels.js';
import { ObjectStoreUI } from './objectstore.js';
import { AIChatUI } from './ai-chat.js';

class GrudaChainApp {
  constructor() {
    this.auth = new AuthManager();
    this.panels = new PanelRenderer(this.auth);
    this.objectStore = new ObjectStoreUI();
    this.aiChat = new AIChatUI();
    this.currentPanel = 'dashboard';
    this.systemStatus = { auth: null, objectStore: null };
  }

  async init() {
    // Auth change handler
    this.auth.onAuthChange = (user) => this._updateAuthUI(user);

    // Initialize auth (checks existing session)
    await this.auth.init();

    // Bind global UI events
    this._bindNavigation();
    this._bindAuthModal();
    this._bindSidebar();
    this._bindIframeOverlay();

    // Initialize AI chat
    this.aiChat.init();

    // Route to initial panel
    const hash = window.location.hash.slice(1) || 'dashboard';
    this.navigate(hash);

    // Check system health in background
    this._checkSystemHealth();
  }

  // --- Navigation ---

  navigate(panel) {
    const valid = ['dashboard', 'gamedata', 'games', 'account'];
    if (!valid.includes(panel)) panel = 'dashboard';

    this.currentPanel = panel;
    window.location.hash = panel;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panel);
    });

    // Update page title
    const titles = { dashboard: 'Dashboard', gamedata: 'Game Data', games: 'Games', account: 'Account' };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[panel] || 'Dashboard';

    // Render panel
    this._renderPanel(panel);
  }

  _renderPanel(panel) {
    const container = document.getElementById('panel-container');
    if (!container) return;

    switch (panel) {
      case 'dashboard':
        container.innerHTML = this.panels.dashboard(this.systemStatus);
        break;
      case 'gamedata':
        container.innerHTML = this.panels.gamedata();
        this.objectStore.init();
        break;
      case 'games':
        container.innerHTML = this.panels.games();
        break;
      case 'account':
        container.innerHTML = this.panels.account();
        break;
    }
  }

  // --- Auth Modal ---

  showAuth() {
    document.getElementById('auth-modal')?.classList.remove('hidden');
  }

  hideAuth() {
    document.getElementById('auth-modal')?.classList.add('hidden');
    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
  }

  async logout() {
    this.auth.logout();
    this.toast('Signed out', 'info');
    this._renderPanel(this.currentPanel);
  }

  _bindAuthModal() {
    // Close button
    document.getElementById('auth-modal-close')?.addEventListener('click', () => this.hideAuth());

    // Click backdrop to close
    document.getElementById('auth-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.hideAuth();
    });

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`auth-${tab.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });

    // Login form
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('login-error');
      errEl?.classList.add('hidden');

      const username = document.getElementById('login-username')?.value;
      const password = document.getElementById('login-password')?.value;

      try {
        await this.auth.login(username, password);
        this.hideAuth();
        this.toast('Signed in successfully!', 'success');
        this._renderPanel(this.currentPanel);
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      }
    });

    // Register form
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('register-error');
      errEl?.classList.add('hidden');

      const username = document.getElementById('reg-username')?.value;
      const email = document.getElementById('reg-email')?.value;
      const password = document.getElementById('reg-password')?.value;

      try {
        await this.auth.register(username, email, password);
        this.hideAuth();
        this.toast('Account created! A Solana wallet has been linked.', 'success');
        this._renderPanel(this.currentPanel);
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      }
    });

    // Guest button
    document.getElementById('guest-login-btn')?.addEventListener('click', async () => {
      const errEl = document.getElementById('guest-error');
      errEl?.classList.add('hidden');

      try {
        await this.auth.guest();
        this.hideAuth();
        this.toast('Continuing as guest', 'info');
        this._renderPanel(this.currentPanel);
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      }
    });

    // Auth button in top bar
    document.getElementById('auth-btn')?.addEventListener('click', () => {
      if (this.auth.isAuthenticated) {
        this.navigate('account');
      } else {
        this.showAuth();
      }
    });
  }

  // --- Sidebar ---

  _bindSidebar() {
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      // Mobile: toggle open class
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });

    // Sidebar user click → account
    document.getElementById('sidebar-user')?.addEventListener('click', () => {
      this.navigate('account');
    });
  }

  // --- Navigation ---

  _bindNavigation() {
    // Hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      if (hash !== this.currentPanel) this.navigate(hash);
    });

    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const panel = item.dataset.panel;
        if (panel) this.navigate(panel);
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
      });
    });

    // AI toggle
    document.getElementById('ai-toggle')?.addEventListener('click', () => this.toggleAI());
  }

  // --- AI Chat ---

  toggleAI() {
    this.aiChat.toggle();
  }

  // --- Internal Browser ---

  openInternal(url, title) {
    const overlay = document.getElementById('iframe-overlay');
    const iframe = document.getElementById('iframe-content');
    const titleEl = document.getElementById('iframe-title');
    if (!overlay || !iframe) return;

    titleEl.textContent = title || url;
    iframe.src = url;
    overlay.classList.remove('hidden');
    overlay._currentUrl = url;
  }

  _bindIframeOverlay() {
    const overlay = document.getElementById('iframe-overlay');
    const iframe = document.getElementById('iframe-content');

    document.getElementById('iframe-close')?.addEventListener('click', () => {
      overlay?.classList.add('hidden');
      if (iframe) iframe.src = '';
    });

    document.getElementById('iframe-back')?.addEventListener('click', () => {
      overlay?.classList.add('hidden');
      if (iframe) iframe.src = '';
    });

    document.getElementById('iframe-external')?.addEventListener('click', () => {
      if (overlay?._currentUrl) {
        window.open(overlay._currentUrl, '_blank');
      }
    });
  }

  // --- Auth UI Updates ---

  _updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    const sidebarName = document.getElementById('sidebar-username');
    const sidebarRole = document.getElementById('sidebar-role');
    const avatarEl = document.querySelector('.user-avatar-sm');

    if (user) {
      if (authBtn) {
        authBtn.textContent = this.auth.displayName;
        authBtn.classList.remove('btn-accent');
        authBtn.classList.add('btn-secondary');
      }
      if (sidebarName) sidebarName.textContent = this.auth.displayName;
      if (sidebarRole) sidebarRole.textContent = this.auth.roleDisplay;
      if (avatarEl) avatarEl.textContent = this.auth.avatarInitial;
    } else {
      if (authBtn) {
        authBtn.textContent = 'Sign In';
        authBtn.classList.remove('btn-secondary');
        authBtn.classList.add('btn-accent');
      }
      if (sidebarName) sidebarName.textContent = 'Guest';
      if (sidebarRole) sidebarRole.textContent = 'Not signed in';
      if (avatarEl) avatarEl.textContent = 'G';
    }
  }

  // --- System Health ---

  async _checkSystemHealth() {
    const [authHealth, objHealth] = await Promise.all([
      this.auth.checkHealth(),
      this.objectStore.checkHealth()
    ]);

    this.systemStatus = { auth: authHealth, objectStore: objHealth };

    // Re-render dashboard if currently viewing it
    if (this.currentPanel === 'dashboard') {
      this._renderPanel('dashboard');
    }
  }

  // --- Toast Notifications ---

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GrudaChainApp();
  window.app = app; // Expose for onclick handlers in panels
  app.init();
});
