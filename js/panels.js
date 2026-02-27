/**
 * GrudaChain Hub - Panel Renderer
 * Generates HTML for each panel/view
 */

export class PanelRenderer {
  constructor(auth) {
    this.auth = auth;
  }

  /** Render Dashboard panel */
  dashboard(systemStatus) {
    const user = this.auth.user;
    const gold = user?.gold ?? '—';
    const gbux = user?.gbuxBalance ?? '—';
    const xp = user?.accountXp ?? '—';
    const wallet = user?.walletAddress ? this._truncAddr(user.walletAddress) : 'None';
    const authStatus = systemStatus?.auth;
    const objStatus = systemStatus?.objectStore;

    return `
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">${gold}</div>
          <div class="stat-label">Gold</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${gbux}</div>
          <div class="stat-label">GBux</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${xp}</div>
          <div class="stat-label">Account XP</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${wallet}</div>
          <div class="stat-label">Wallet</div>
        </div>
      </div>

      <div class="card-grid" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">System Status</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>Auth Gateway</span>
              <span class="game-status">
                <span class="status-dot ${authStatus?.online ? 'online' : 'offline'}"></span>
                ${authStatus?.online ? `v${authStatus.version}` : 'Offline'}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>ObjectStore API</span>
              <span class="game-status">
                <span class="status-dot ${objStatus?.online ? 'online' : 'offline'}"></span>
                ${objStatus?.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>Puter AI</span>
              <span class="game-status">
                <span class="status-dot ${typeof puter !== 'undefined' ? 'online' : 'unknown'}"></span>
                ${typeof puter !== 'undefined' ? 'Available' : 'Not loaded'}
              </span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Quick Actions</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary btn-full" onclick="window.app.navigate('gamedata')">Browse Game Data</button>
            <button class="btn btn-secondary btn-full" onclick="window.app.navigate('games')">Launch Games</button>
            <button class="btn btn-secondary btn-full" onclick="window.app.toggleAI()">Open AI Assistant</button>
            ${!this.auth.isAuthenticated ? 
              '<button class="btn btn-primary btn-full" onclick="window.app.showAuth()">Sign In</button>' : ''}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Welcome to GrudaChain Hub</span>
        </div>
        <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">
          Your unified Grudge Studio command center. Browse game data from ObjectStore, 
          manage your account and wallet, launch games in the internal browser, and chat 
          with Grudge AI — all without leaving this page.
        </p>
      </div>
    `;
  }

  /** Render Game Data panel (ObjectStore browser) */
  gamedata() {
    return `
      <div class="search-bar">
        <input type="text" class="search-input" id="gamedata-search" placeholder="Search weapons, armor, materials, skills...">
        <button class="btn btn-accent" id="gamedata-search-btn">Search</button>
      </div>
      <div class="tab-bar" id="gamedata-tabs">
        <button class="tab-btn active" data-category="weapons">Weapons</button>
        <button class="tab-btn" data-category="armor">Armor</button>
        <button class="tab-btn" data-category="materials">Materials</button>
        <button class="tab-btn" data-category="consumables">Consumables</button>
        <button class="tab-btn" data-category="skills">Skills</button>
        <button class="tab-btn" data-category="races">Races</button>
        <button class="tab-btn" data-category="classes">Classes</button>
        <button class="tab-btn" data-category="factions">Factions</button>
      </div>
      <div id="gamedata-content">
        <div class="spinner"></div>
      </div>
    `;
  }

  /** Render Games panel */
  games() {
    const gamesList = [
      {
        id: 'grudge-warlords',
        title: 'Grudge Warlords',
        desc: 'The flagship MMO — 5 professions, 518 recipes, faction warfare, island conquest, and souls-like combat.',
        icon: '&#x2694;',
        url: 'https://warlord-crafting-suite.vercel.app',
        status: 'live'
      },
      {
        id: 'grudge-studio',
        title: 'Grudge Studio',
        desc: 'Development hub with AI agents for code, art, lore, balance, QA, and mission design.',
        icon: '&#x1F3A8;',
        url: 'https://grudge-studio.puter.site',
        status: 'live'
      },
      {
        id: 'grudge-cloud',
        title: 'Grudge Cloud',
        desc: 'Cloud storage and asset management powered by Puter.',
        icon: '&#x2601;',
        url: 'https://grudge-cloud.puter.site',
        status: 'live'
      },
      {
        id: 'grudge-social',
        title: 'Grudge Social',
        desc: 'Community hub for Grudge players — chat, forums, guilds.',
        icon: '&#x1F465;',
        url: 'https://grudge-social.puter.site',
        status: 'live'
      },
      {
        id: 'grudge-auth',
        title: 'Grudge Auth Portal',
        desc: 'Account management, wallet linking, and authentication.',
        icon: '&#x1F512;',
        url: 'https://auth.grudgestudio.com',
        status: 'live'
      },
      {
        id: 'gruda-wars',
        title: 'GRUDA Wars',
        desc: 'Large-scale faction battles with RTS elements and AI commanders.',
        icon: '&#x1F6E1;',
        url: null,
        status: 'coming-soon'
      },
      {
        id: 'ocean-angler',
        title: 'Ocean Angler',
        desc: 'Relaxing fishing game with rare catches, trading, and ocean exploration.',
        icon: '&#x1F3A3;',
        url: null,
        status: 'coming-soon'
      },
      {
        id: 'grudge-builder',
        title: 'Grudge Builder',
        desc: 'Character creator with full RPG stats, skills, island management, and crafting.',
        icon: '&#x1F3D7;',
        url: null,
        status: 'coming-soon'
      }
    ];

    return `
      <p class="section-subtitle">Click any game to open it in the internal browser. No new tabs — everything stays in the hub.</p>
      <div class="card-grid">
        ${gamesList.map(g => `
          <div class="game-card" ${g.url ? `onclick="window.app.openInternal('${g.url}', '${g.title}')"` : ''} 
               style="${!g.url ? 'opacity:0.6;cursor:default' : ''}">
            <div class="game-card-header">
              <div class="game-icon">${g.icon}</div>
              <span class="game-title">${g.title}</span>
            </div>
            <div class="game-desc">${g.desc}</div>
            <div class="game-status">
              <span class="status-dot ${g.status === 'live' ? 'online' : 'unknown'}"></span>
              ${g.status === 'live' ? 'Live' : 'Coming Soon'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /** Render Account panel */
  account() {
    const user = this.auth.user;

    if (!this.auth.isAuthenticated) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F464;</div>
          <div class="empty-state-title">Not Signed In</div>
          <div class="empty-state-desc">Sign in to view your account, characters, wallet, and game progress.</div>
          <button class="btn btn-primary" style="margin-top:20px" onclick="window.app.showAuth()">Sign In</button>
        </div>
      `;
    }

    const roleClass = user.role === 'admin' ? 'role-admin' : 
                       user.role === 'premium' ? 'role-premium' :
                       user.isGuest ? 'role-guest' : 'role-user';

    return `
      <div class="profile-card">
        <div class="profile-avatar">${this.auth.avatarInitial}</div>
        <div class="profile-info">
          <div class="profile-name">${user.displayName || user.username}</div>
          <div class="profile-grudge-id">${user.grudgeId || 'No GRUDGE ID'}</div>
          <span class="profile-role ${roleClass}">${this.auth.roleDisplay}</span>
        </div>
        <button class="btn btn-secondary" onclick="window.app.logout()">Sign Out</button>
      </div>

      <h3 class="section-title">Account Details</h3>
      <div class="info-grid" style="margin-bottom:24px">
        <div class="info-item">
          <span class="info-label">Username</span>
          <span class="info-value">${user.username}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">${user.email || '—'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Gold</span>
          <span class="info-value" style="color:var(--warning)">${user.gold ?? 0}</span>
        </div>
        <div class="info-item">
          <span class="info-label">GBux</span>
          <span class="info-value" style="color:var(--accent-purple)">${user.gbuxBalance ?? 0}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Account XP</span>
          <span class="info-value">${user.accountXp ?? 0}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Member Since</span>
          <span class="info-value">${user.createdAt ? new Date(parseInt(user.createdAt)).toLocaleDateString() : '—'}</span>
        </div>
      </div>

      <h3 class="section-title">Wallet</h3>
      <div class="info-grid" style="margin-bottom:24px">
        <div class="info-item">
          <span class="info-label">SOL Address</span>
          <span class="info-value" title="${user.walletAddress || ''}">${user.walletAddress ? this._truncAddr(user.walletAddress) : 'Not connected'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Wallet Status</span>
          <span class="info-value">${user.hasWallet ? '<span style="color:var(--success)">Connected</span>' : '<span style="color:var(--text-muted)">Not linked</span>'}</span>
        </div>
      </div>

      <h3 class="section-title">Linked Accounts</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Discord</span>
          <span class="info-value">${user.hasDiscord ? '<span style="color:var(--success)">Connected</span>' : '<span style="color:var(--text-muted)">Not linked</span>'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Puter</span>
          <span class="info-value">${user.hasPuter ? '<span style="color:var(--success)">Connected</span>' : '<span style="color:var(--text-muted)">Not linked</span>'}</span>
        </div>
        ${(user.linkedMethods || []).map(m => `
          <div class="info-item">
            <span class="info-label">${m.provider}</span>
            <span class="info-value">${m.username || 'Linked'}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  _truncAddr(addr) {
    if (!addr || addr.length < 12) return addr || '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }
}
