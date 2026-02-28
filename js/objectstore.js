/**
 * GrudaChain Hub - ObjectStore Browser
 * Fetches game data from molochdagod.github.io/ObjectStore/api/v1/
 */

const API_BASE = 'https://molochdagod.github.io/ObjectStore/api/v1';
const ICON_BASE = 'https://molochdagod.github.io/ObjectStore/icons';

export class ObjectStoreUI {
  constructor() {
    this.cache = new Map();
    this.iconIndex = null;
    this.activeCategory = 'weapons';
    this.searchQuery = '';
    this.detailEl = null;
  }

  /** Initialize after panel is rendered */
  async init() {
    // Load icon index for sprite lookups
    if (!this.iconIndex) {
      try {
        const res = await fetch(`${ICON_BASE}/icon-index.json`);
        this.iconIndex = res.ok ? await res.json() : {};
      } catch { this.iconIndex = {}; }
    }
    this._bindTabs();
    this._bindSearch();
    this.loadCategory('weapons');
    this._createDetailOverlay();
  }

  /** Fetch with cache */
  async _fetch(endpoint) {
    if (this.cache.has(endpoint)) return this.cache.get(endpoint);
    const res = await fetch(`${API_BASE}/${endpoint}`);
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    const data = await res.json();
    this.cache.set(endpoint, data);
    return data;
  }

  /** Check if ObjectStore API is reachable */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/weapons.json`, { method: 'HEAD' });
      return { online: res.ok };
    } catch {
      return { online: false };
    }
  }

  /** Load and render a category */
  async loadCategory(category) {
    this.activeCategory = category;
    const content = document.getElementById('gamedata-content');
    if (!content) return;

    content.innerHTML = '<div class="spinner"></div>';

    try {
      let html = '';
      switch (category) {
        case 'weapons': html = await this._renderWeapons(); break;
        case 'armor': html = await this._renderArmor(); break;
        case 'materials': html = await this._renderMaterials(); break;
        case 'consumables': html = await this._renderConsumables(); break;
        case 'skills': html = await this._renderSkills(); break;
        case 'races': html = await this._renderRaces(); break;
        case 'classes': html = await this._renderClasses(); break;
        case 'factions': html = await this._renderFactions(); break;
        default: html = '<div class="empty-state"><div class="empty-state-title">Unknown category</div></div>';
      }
      content.innerHTML = html;
      this._bindItemClicks(content);
    } catch (err) {
      content.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">&#x26A0;</div>
        <div class="empty-state-title">Failed to load data</div>
        <div class="empty-state-desc">${err.message}</div>
      </div>`;
    }
  }

  /** Search across all data */
  async search(query) {
    if (!query.trim()) return this.loadCategory(this.activeCategory);

    const content = document.getElementById('gamedata-content');
    if (!content) return;
    content.innerHTML = '<div class="spinner"></div>';

    const q = query.toLowerCase();
    const results = [];

    try {
      const [weapons, materials, consumables, skills, races, classes] = await Promise.all([
        this._fetch('weapons.json'),
        this._fetch('materials.json'),
        this._fetch('consumables.json'),
        this._fetch('skills.json'),
        this._fetch('races.json'),
        this._fetch('classes.json')
      ]);

      // Search weapons
      for (const [cat, data] of Object.entries(weapons.categories || {})) {
        for (const item of (data.items || [])) {
          if (this._matches(item, q)) results.push({ ...item, _type: 'weapon', _cat: cat });
        }
      }

      // Search materials
      for (const [cat, data] of Object.entries(materials.categories || {})) {
        for (const item of (data.items || [])) {
          if (this._matches(item, q)) results.push({ ...item, _type: 'material', _cat: cat });
        }
      }

      // Search consumables
      for (const [cat, data] of Object.entries(consumables.categories || {})) {
        for (const item of (data.items || [])) {
          if (this._matches(item, q)) results.push({ ...item, _type: 'consumable', _cat: cat });
        }
      }

      // Search skills
      for (const [cat, data] of Object.entries(skills.categories || {})) {
        for (const item of (data.skills || [])) {
          if (this._matches(item, q)) results.push({ ...item, _type: 'skill', _cat: cat });
        }
      }

      // Search races
      for (const race of Object.values(races.races || {})) {
        if (this._matches(race, q)) results.push({ ...race, _type: 'race' });
      }

      // Search classes
      for (const cls of Object.values(classes.classes || {})) {
        if (this._matches(cls, q)) results.push({ ...cls, _type: 'class' });
      }

      if (results.length === 0) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">&#x1F50D;</div>
          <div class="empty-state-title">No results for "${query}"</div>
        </div>`;
        return;
      }

      content.innerHTML = `
        <p class="section-subtitle">${results.length} results for "${query}"</p>
        <div class="card-grid-sm">
          ${results.map(item => this._itemCard(item)).join('')}
        </div>
      `;
      this._bindItemClicks(content);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-title">Search failed</div></div>`;
    }
  }

  // --- Category Renderers ---

  async _renderWeapons() {
    const data = await this._fetch('weapons.json');
    const cats = data.categories || {};
    let items = [];
    for (const [cat, d] of Object.entries(cats)) {
      for (const item of (d.items || [])) {
        items.push({ ...item, _type: 'weapon', _cat: cat });
      }
    }
    if (this.searchQuery) items = items.filter(i => this._matches(i, this.searchQuery));
    return this._renderGrid(items, `${items.length} weapons across ${Object.keys(cats).length} categories`);
  }

  async _renderArmor() {
    const data = await this._fetch('armor.json');
    const slots = data.slots || {};
    let items = [];
    for (const [slot, d] of Object.entries(slots)) {
      if (Array.isArray(d)) {
        for (const item of d) items.push({ ...item, _type: 'armor', _cat: slot });
      } else if (d.items) {
        for (const item of d.items) items.push({ ...item, _type: 'armor', _cat: slot });
      }
    }
    return this._renderGrid(items, `${items.length} armor pieces`);
  }

  async _renderMaterials() {
    const data = await this._fetch('materials.json');
    const cats = data.categories || {};
    let items = [];
    for (const [cat, d] of Object.entries(cats)) {
      for (const item of (d.items || [])) {
        items.push({ ...item, _type: 'material', _cat: cat });
      }
    }
    return this._renderGrid(items, `${items.length} materials`);
  }

  async _renderConsumables() {
    const data = await this._fetch('consumables.json');
    const cats = data.categories || {};
    let items = [];
    for (const [cat, d] of Object.entries(cats)) {
      for (const item of (d.items || [])) {
        items.push({ ...item, _type: 'consumable', _cat: cat, _profession: d.profession });
      }
    }
    return this._renderGrid(items, `${items.length} consumables`);
  }

  async _renderSkills() {
    const data = await this._fetch('skills.json');
    const cats = data.categories || {};
    let items = [];
    for (const [cat, d] of Object.entries(cats)) {
      for (const skill of (d.skills || [])) {
        items.push({ ...skill, _type: 'skill', _cat: cat });
      }
    }
    return this._renderGrid(items, `${items.length} skills`);
  }

  async _renderRaces() {
    const data = await this._fetch('races.json');
    const races = Object.values(data.races || {});
    const items = races.map(r => ({ ...r, _type: 'race' }));
    return this._renderGrid(items, `${items.length} races`);
  }

  async _renderClasses() {
    const data = await this._fetch('classes.json');
    const classes = Object.values(data.classes || {});
    const items = classes.map(c => ({ ...c, _type: 'class' }));
    return this._renderGrid(items, `${items.length} classes`);
  }

  async _renderFactions() {
    const data = await this._fetch('factions.json');
    const factions = Object.values(data.factions || {});
    const items = factions.map(f => ({ ...f, _type: 'faction' }));
    return this._renderGrid(items, `${items.length} factions`);
  }

  // --- Rendering Helpers ---

  _renderGrid(items, subtitle) {
    if (items.length === 0) {
      return `<div class="empty-state"><div class="empty-state-title">No items found</div></div>`;
    }
    return `
      <p class="section-subtitle">${subtitle}</p>
      <div class="card-grid-sm">
        ${items.map(item => this._itemCard(item)).join('')}
      </div>
    `;
  }

  /** Build a flat weapon name → icon path map from icon-index */
  _buildWeaponMap() {
    if (this._weaponIconMap) return this._weaponIconMap;
    this._weaponIconMap = new Map();
    const idx = this.iconIndex || {};
    if (idx.weapons) {
      for (const catIcons of Object.values(idx.weapons)) {
        if (typeof catIcons !== 'object') continue;
        for (const [key, path] of Object.entries(catIcons)) {
          this._weaponIconMap.set(key, path);
        }
      }
    }
    return this._weaponIconMap;
  }

  /** Resolve an icon URL for an item */
  _getIconUrl(item) {
    const idx = this.iconIndex || {};
    const id = (item.id || '').toLowerCase();
    const type = item._type || '';
    const cat = item._cat || '';

    // Weapons: match id segments against flat icon-index map
    if (type === 'weapon') {
      const wmap = this._buildWeaponMap();
      // Try each segment of the kebab-case id (e.g. "bloodfeud-blade" → "bloodfeud", "blade")
      const segments = id.split('-');
      for (const seg of segments) {
        if (wmap.has(seg)) return `${ICON_BASE}/${wmap.get(seg)}`;
      }
      // Try full id
      if (wmap.has(id)) return `${ICON_BASE}/${wmap.get(id)}`;
      // Try compound matches (e.g. "ironwrath" from "ironwrath-greatsword")
      for (const [key, path] of wmap) {
        if (id.includes(key) || key.includes(segments[0])) return `${ICON_BASE}/${path}`;
      }
      return null;
    }

    // Materials: match by material sub-category (ore, ingot, wood, cloth)
    if (type === 'material' && idx.materials) {
      const matCat = idx.materials[cat];
      if (matCat && typeof matCat === 'object' && Object.keys(matCat).length > 0) {
        // Try matching item id to a material key
        for (const [key, path] of Object.entries(matCat)) {
          const keyBase = key.split('-')[0];
          if (id.includes(keyBase) || keyBase.includes(id.split('-')[0])) {
            return `${ICON_BASE}/${path}`;
          }
        }
        // Fallback: first icon in that material category
        return `${ICON_BASE}/${Object.values(matCat)[0]}`;
      }
      return null;
    }

    // Consumables: use prefix-based icons
    if (type === 'consumable' && idx.consumables) {
      const consCat = idx.consumables[cat];
      if (consCat && consCat.prefix) {
        return `${ICON_BASE}/consumables/${consCat.prefix}01.png`;
      }
      return null;
    }

    // Skills: use skill icon sprites if available
    if (type === 'skill' && idx.sprites && idx.sprites.skillIcons) {
      for (const [key, path] of Object.entries(idx.sprites.skillIcons)) {
        if (id.includes(key.split('-')[0])) return `${ICON_BASE}/${path}`;
      }
    }

    // Armor: use generic armor prefix
    if (type === 'armor' && idx.armor && idx.armor.generic) {
      return `${ICON_BASE}/armor/${idx.armor.generic.prefix}01.png`;
    }

    return null;
  }

  _itemCard(item) {
    const name = item.name || item.id || 'Unknown';
    const tier = item.tier || item.level || '';
    const type = item._type || '';
    const cat = item._cat || '';
    const tierClass = tier ? `tier-${Math.min(tier, 6)}` : '';
    const iconUrl = this._getIconUrl(item);
    const emoji = item.emoji || this._typeEmoji(type);

    let meta = type;
    if (cat) meta += ` · ${cat}`;
    if (item.damage) meta += ` · ${item.damage} dmg`;
    if (item.defense) meta += ` · ${item.defense} def`;
    if (item.trait) meta += ` · ${item.trait}`;
    if (item.faction) meta += ` · ${item.faction}`;

    const iconHtml = iconUrl
      ? `<img class="item-icon" src="${iconUrl}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="item-icon-fallback" style="display:none">${emoji}</div>`
      : `<div class="item-icon-fallback">${emoji}</div>`;

    return `
      <div class="item-card" data-item='${JSON.stringify(item).replace(/'/g, '&#39;')}'>
        <div class="item-card-icon">
          ${iconHtml}
        </div>
        <div class="item-card-info">
          <div class="item-name">${name}</div>
          <div class="item-meta">
            ${tier ? `<span class="item-tier ${tierClass}">T${tier}</span> ` : ''}
            ${meta}
          </div>
        </div>
      </div>
    `;
  }

  _typeEmoji(type) {
    const map = { weapon: '⚔️', armor: '🛡️', material: '🪨', consumable: '🧪', skill: '✨', race: '👤', class: '⚔️', faction: '🏴' };
    return map[type] || '📦';
  }

  _matches(item, query) {
    const q = query.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
    const trait = (item.trait || '').toLowerCase();
    return name.includes(q) || id.includes(q) || trait.includes(q);
  }

  // --- Detail Overlay ---

  _createDetailOverlay() {
    if (document.getElementById('item-detail')) return;
    const el = document.createElement('div');
    el.id = 'item-detail';
    el.className = 'detail-overlay';
    el.innerHTML = `
      <div class="detail-header">
        <span class="card-title" id="detail-title">Item</span>
        <button class="icon-btn-sm" id="detail-close">&#x2715;</button>
      </div>
      <div class="detail-body" id="detail-body"></div>
    `;
    document.body.appendChild(el);
    this.detailEl = el;

    el.querySelector('#detail-close').addEventListener('click', () => {
      el.classList.remove('open');
    });
  }

  _showDetail(item) {
    if (!this.detailEl) return;
    const title = this.detailEl.querySelector('#detail-title');
    const body = this.detailEl.querySelector('#detail-body');

    title.textContent = item.name || item.id || 'Unknown';
    const iconUrl = this._getIconUrl(item);
    const emoji = item.emoji || this._typeEmoji(item._type || '');

    const skip = new Set(['_type', '_cat', '_profession', 'name', 'emoji', 'spritePath']);
    const rows = Object.entries(item)
      .filter(([k]) => !skip.has(k) && !k.startsWith('_'))
      .map(([k, v]) => {
        let val;
        if (Array.isArray(v)) {
          val = `<ul class="detail-list">${v.map(i => `<li>${i}</li>`).join('')}</ul>`;
        } else if (typeof v === 'object') {
          val = `<div class="detail-stats">${Object.entries(v).map(([sk, sv]) =>
            `<span class="stat-chip">${sk}: ${sv}</span>`
          ).join('')}</div>`;
        } else {
          val = String(v);
        }
        return `<div class="detail-row">
          <span class="detail-row-label">${k}</span>
          <span class="detail-row-value">${val}</span>
        </div>`;
      });

    const iconHtml = iconUrl
      ? `<div class="detail-icon"><img src="${iconUrl}" alt="${item.name || ''}" onerror="this.parentElement.innerHTML='<span class=detail-icon-emoji>${emoji}</span>'"></div>`
      : `<div class="detail-icon"><span class="detail-icon-emoji">${emoji}</span></div>`;

    body.innerHTML = iconHtml + rows.join('') || '<p style="color:var(--text-muted)">No additional data</p>';
    this.detailEl.classList.add('open');
  }

  // --- Event Binding ---

  _bindTabs() {
    const tabs = document.getElementById('gamedata-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.loadCategory(btn.dataset.category);
    });
  }

  _bindSearch() {
    const input = document.getElementById('gamedata-search');
    const btn = document.getElementById('gamedata-search-btn');
    if (!input) return;

    const doSearch = () => this.search(input.value);
    if (btn) btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  }

  _bindItemClicks(container) {
    container.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        try {
          const item = JSON.parse(card.dataset.item);
          this._showDetail(item);
        } catch { /* ignore */ }
      });
    });
  }
}
