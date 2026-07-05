/**
 * grudge-fleet-connect.js — Embeddable fleet connectivity widget
 *
 * Keeps users linked to Grudge ID, characters, home-islands, and saves
 * across grudachain, gdevelop-assistant, grudge-platform, and WCS.
 *
 * Usage:
 *   <script src="https://grudachain.grudge-studio.com/grudge-fleet-connect.js"></script>
 *   <div id="grudge-fleet-connect"></div>
 *   <script>GrudgeFleetConnect.mount('#grudge-fleet-connect');</script>
 *
 * Or auto-mount floating pill:
 *   <script>GrudgeFleetConnect.autoMount({ mode: 'pill' });</script>
 */
(function () {
  'use strict';

  var NEXUS_CANONICAL = 'https://nexus.grudge-studio.com';
  var NEXUS_ALIAS = 'https://grudachain.grudge-studio.com';
  var NEXUS_FALLBACK = NEXUS_CANONICAL;

  function resolveNexusOrigin() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('grudge-fleet-connect.js') >= 0) {
        try { return new URL(src).origin; } catch (e) {}
      }
    }
    var host = location.hostname || '';
    if (host === 'nexus.grudge-studio.com' || host === 'grudachain.grudge-studio.com' || host === 'platform.grudge-studio.com') {
      return location.origin;
    }
    return NEXUS_FALLBACK;
  }

  var NEXUS_ORIGIN = resolveNexusOrigin();

  var TOKEN_KEY = 'grudge_auth_token';
  var LEGACY_TOKEN_KEY = 'grudge_token';
  var USER_KEY = 'grudge_username';
  var ID_KEY = 'grudge_id';
  var ACCOUNT_ID_KEY = 'grudge_account_id';
  var CHAR_ACTIVE_PREFIX = 'gruda_active_character';
  var CONFIG_URL = NEXUS_ORIGIN + '/api/fleet/connect';
  var DEFAULT_CONFIG = {
    playerHub: {
      characters: 'https://character.grudge-studio.com',
      island: 'https://wcs.grudge-studio.com/island-hub',
      warlords: 'https://grudgewarlords.com',
      account: 'https://id.grudge-studio.com'
    },
    tools: {
      nexus: NEXUS_ORIGIN,
      grudgedot: 'https://coder.grudge-studio.com',
      devTool: { download: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest' },
      legion: 'https://ai.grudge-studio.com',
      puterCloud: 'https://grudge-studio.puter.site',
      ale: 'https://ale.grudge-studio.com'
    },
    cloud: {
      puter: 'https://grudge-studio.puter.site',
      saves: 'grudge-studio/player-data',
      assets: 'grudge-studio/assets'
    },
    auth: { gateway: 'https://id.grudge-studio.com' }
  };

  var config = null;
  var characters = null;
  var homeIslandId = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  }
  function getUsername() { return localStorage.getItem(USER_KEY); }
  function getGrudgeId() { return localStorage.getItem(ID_KEY); }

  function readActiveId() {
    var gid = localStorage.getItem(ACCOUNT_ID_KEY) || getGrudgeId() || 'guest';
    return localStorage.getItem(CHAR_ACTIVE_PREFIX + '_' + gid) || localStorage.getItem('grudge.activeCharId');
  }

  function saveActiveId(id) {
    var gid = localStorage.getItem(ACCOUNT_ID_KEY) || getGrudgeId() || 'guest';
    if (id) {
      localStorage.setItem(CHAR_ACTIVE_PREFIX + '_' + gid, id);
      localStorage.setItem('grudge.activeCharId', id);
    }
  }

  /** GRDG-HUMWAR-XL1U4I8U → { race: 'Human', class: 'Warrior' } */
  function decodeGrdgCharId(id) {
    if (!id || id.indexOf('GRDG-') !== 0) return null;
    var tag = (id.split('-')[1] || '').toUpperCase();
    if (!tag) return null;
    var RACE = { HUM: 'Human', ELF: 'Elf', DWF: 'Dwarf', ORC: 'Orc', BRB: 'Barbarian', UND: 'Undead' };
    var CLASS = { WAR: 'Warrior', MAG: 'Mage', RNG: 'Ranger', WRG: 'Worg', SHP: 'Shapeshifter' };
    return {
      race: RACE[tag.slice(0, 3)] || tag.slice(0, 3),
      class: CLASS[tag.slice(3)] || tag.slice(3)
    };
  }

  function resolveActiveChar(list) {
    if (!list || !list.length) return null;
    var stored = readActiveId();
    if (stored) {
      var hit = list.find(function (c) { return c.id === stored; });
      if (hit) return hit;
    }
    return list.find(function (c) { return c.activeForEra || c.isActive; }) || list[0];
  }

  function isSignedIn() { return !!getToken(); }

  function buildAuthLoginUrl(returnUrl, app) {
    var gateway = (config && config.auth && config.auth.login)
      ? config.auth.login.replace(/\/api\/auth\/page.*$/, '').replace(/\/auth.*$/, '')
      : ((config && config.auth && config.auth.gateway) || DEFAULT_CONFIG.auth.gateway);
    var page = (config && config.auth && config.auth.login && config.auth.login.indexOf('/api/auth/page') >= 0)
      ? config.auth.login.split('?')[0]
      : gateway + '/api/auth/page';
    return page + '?app=' + encodeURIComponent(app || 'fleet-connect') + '&redirect=' + encodeURIComponent(returnUrl || window.location.href);
  }

  function ssoUrl(url) {
    if (!url || !isSignedIn()) return url;
    try {
      var u = new URL(url);
      u.searchParams.set('token', getToken());
      if (getUsername()) u.searchParams.set('username', getUsername());
      if (getGrudgeId()) u.searchParams.set('grudge_id', getGrudgeId());
      var active = resolveActiveChar(characters);
      if (active && active.id) u.searchParams.set('characterId', active.id);
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function loadConfig() {
    if (config) return Promise.resolve(config);
    return fetch(CONFIG_URL, { signal: AbortSignal.timeout(5000) })
      .then(function (r) { return r.ok ? r.json() : DEFAULT_CONFIG; })
      .catch(function () { return DEFAULT_CONFIG; })
      .then(function (data) {
        config = data.playerHub ? data : DEFAULT_CONFIG;
        return config;
      });
  }

  /** Same-origin Nexus proxy first; manifest api.* fallback; Railway SSOT last resort */
  function resolveApiUrl(kind) {
    var host = location.hostname || '';
    var onNexus =
      host === 'nexus.grudge-studio.com' ||
      host === 'grudachain.grudge-studio.com' ||
      host === 'platform.grudge-studio.com' ||
      host === 'grudachain-rho.vercel.app' ||
      host === 'grudachain.vercel.app';
    if (onNexus) {
      if (kind === 'account') return location.origin + '/api/account/me';
      if (kind === 'characters') return location.origin + '/api/characters';
    }
    if (config && config.api) {
      if (kind === 'account' && config.api.account) return config.api.account;
      if (kind === 'characters' && config.api.characters) return config.api.characters;
    }
    if (kind === 'account') return 'https://grudge-api-production-0d46.up.railway.app/api/account';
    return 'https://grudge-api-production-0d46.up.railway.app/api/characters';
  }

  function fetchPlayerData() {
    var token = getToken();
    if (!token) return Promise.resolve(null);

    return fetch(resolveApiUrl('account'), {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(6000)
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return null;
        var acct = data.account || data;
        homeIslandId = acct.homeIslandId || acct.home_island_id || null;
        return acct;
      })
      .catch(function () { return null; })
      .then(function (acct) {
        if (!acct) return null;
        return fetch(resolveApiUrl('characters') + '?era=warlords', {
          headers: { Authorization: 'Bearer ' + token },
          signal: AbortSignal.timeout(6000)
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            characters = (data && (data.characters || data)) || [];
            if (!Array.isArray(characters)) characters = [];
            var active = resolveActiveChar(characters);
            if (active && active.id) saveActiveId(active.id);
            document.dispatchEvent(new CustomEvent('grudge:character:updated', {
              detail: { character: active, characters: characters }
            }));
            return { account: acct, characters: characters };
          })
          .catch(function () { return { account: acct, characters: [] }; });
      });
  }

  function injectStyles() {
    if (document.getElementById('grudge-fleet-connect-styles')) return;
    var style = document.createElement('style');
    style.id = 'grudge-fleet-connect-styles';
    style.textContent = [
      '.gfc-root{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#e8e0d0}',
      '.gfc-card{background:linear-gradient(180deg,#1a1f2e,#12151f);border:1px solid rgba(212,175,55,.35);border-radius:8px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.4)}',
      '.gfc-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}',
      '.gfc-title{font-weight:600;color:#d4af37;font-size:12px;letter-spacing:.04em;text-transform:uppercase}',
      '.gfc-user{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px;background:rgba(0,0,0,.25);border-radius:6px}',
      '.gfc-avatar{width:32px;height:32px;border-radius:50%;background:#2a3040;display:flex;align-items:center;justify-content:center;color:#d4af37;font-weight:700;font-size:12px;border:1px solid rgba(212,175,55,.3)}',
      '.gfc-name{font-weight:600;color:#f0e6d0}',
      '.gfc-meta{font-size:11px;color:#9a9080}',
      '.gfc-links{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}',
      '.gfc-link{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:6px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.2);color:#e8dcc8;text-decoration:none;font-size:12px;transition:all .15s}',
      '.gfc-link:hover{background:rgba(212,175,55,.18);border-color:rgba(212,175,55,.5);color:#fff}',
      '.gfc-signin{display:block;text-align:center;padding:10px;background:linear-gradient(135deg,#b8860b,#d4af37);color:#0a0a0f;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px}',
      '.gfc-signin:hover{filter:brightness(1.1)}',
      '.gfc-pill{position:fixed;bottom:16px;right:16px;z-index:99990}',
      '.gfc-pill-btn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:24px;background:linear-gradient(135deg,#1a1f2e,#0d1120);border:2px solid rgba(212,175,55,.5);color:#d4af37;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.5);font-size:13px;font-weight:600}',
      '.gfc-pill-panel{position:absolute;bottom:52px;right:0;width:280px;display:none}',
      '.gfc-pill-panel.open{display:block}',
      '.gfc-char-row{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;color:#c0b8a8;flex-wrap:wrap}',
      '.gfc-char-lvl{background:rgba(212,175,55,.15);color:#d4af37;padding:1px 5px;border-radius:3px;font-size:10px}',
      '.gfc-char-id{font-family:ui-monospace,monospace;font-size:10px;color:#8a8070;word-break:break-all}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderCard(el, opts) {
    injectStyles();
    var hub = (config && config.playerHub) || DEFAULT_CONFIG.playerHub;
    var tools = (config && config.tools) || DEFAULT_CONFIG.tools;
    var signedIn = isSignedIn();
    var username = getUsername() || 'Player';
    var grudgeId = getGrudgeId() || '';
    var activeChar = resolveActiveChar(characters);
    var decoded = activeChar && activeChar.id ? decodeGrdgCharId(activeChar.id) : null;
    var islandUrl = homeIslandId
      ? hub.island + (hub.island.indexOf('?') >= 0 ? '&' : '?') + 'island=' + homeIslandId
      : hub.island;
    var combatUrl = 'https://grudge-studio.com/super-engine';
    if (activeChar && activeChar.id) {
      combatUrl += (combatUrl.indexOf('?') >= 0 ? '&' : '?') + 'characterId=' + encodeURIComponent(activeChar.id);
    }

    var html = '<div class="gfc-root gfc-card">';
    html += '<div class="gfc-header"><span class="gfc-title">Grudge Fleet</span>';
    if (signedIn) html += '<span class="gfc-meta">' + (characters ? characters.length : '…') + ' chars</span>';
    html += '</div>';

    if (signedIn) {
      html += '<div class="gfc-user">';
      html += '<div class="gfc-avatar">' + username.slice(0, 2).toUpperCase() + '</div>';
      html += '<div><div class="gfc-name">' + escapeHtml(username) + '</div>';
      html += '<div class="gfc-meta">' + (grudgeId ? escapeHtml(grudgeId.slice(0, 16)) + '…' : 'Linked') + '</div></div></div>';

      if (activeChar) {
        var raceClass = decoded
          ? decoded.race + ' ' + decoded.class
          : ((activeChar.raceId || activeChar.race || '') + ' ' + (activeChar.classId || activeChar.class || '')).trim();
        html += '<div class="gfc-char-row"><span>' + escapeHtml(activeChar.name || raceClass || 'Hero') + '</span>';
        html += '<span class="gfc-char-lvl">Lv ' + (activeChar.level || 1) + '</span></div>';
        if (activeChar.id) {
          html += '<div class="gfc-char-id">' + escapeHtml(activeChar.id) + '</div>';
        }
      }

      html += '<div class="gfc-links">';
      html += link('Characters', ssoUrl(hub.characters));
      html += link('Home Island', ssoUrl(islandUrl));
      html += link('Play Warlords', ssoUrl(hub.warlords || hub.characters));
      html += link('Super Engine', ssoUrl(combatUrl));
      html += link('grudgeDot', ssoUrl(tools.grudgedot));
      html += link('Nexus', ssoUrl(tools.nexus));
      html += link('Studio Forge', tools.devTool && tools.devTool.download ? tools.devTool.download : '#');
      html += link('Legion AI', ssoUrl(tools.legion));
      html += link('Puter Cloud', ssoUrl(tools.puterCloud || (config.cloud && config.cloud.puter)));
      html += link('My Saves', ssoUrl(tools.puterCloud || 'https://grudge-studio.puter.site'));
      html += '</div>';
    } else {
      var authApp = (location.hostname === 'nexus.grudge-studio.com' || location.hostname === 'grudachain.grudge-studio.com') ? 'nexus' : 'fleet-connect';
      var authUrl = buildAuthLoginUrl(window.location.href, authApp);
      html += '<p class="gfc-meta" style="margin:0 0 10px">Sign in to sync characters, islands, and saves across the fleet.</p>';
      html += '<a class="gfc-signin" href="' + authUrl + '">Sign in with Grudge ID</a>';
      html += '<div class="gfc-links" style="margin-top:10px">';
      html += link('grudgeDot', ssoUrl(tools.grudgedot));
      html += link('Nexus Hub', ssoUrl(tools.nexus));
      html += link('Download Forge', tools.devTool && tools.devTool.download ? tools.devTool.download : '#');
      html += '</div>';
    }

    html += '</div>';
    el.innerHTML = html;
    wireLinks(el);
  }

  function link(label, href) {
    return '<a class="gfc-link" href="' + escapeAttr(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + '</a>';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(s) { return escapeHtml(s); }

  function wireLinks(root) {
    var links = root.querySelectorAll('a.gfc-link, a.gfc-signin');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        if (window.GrudgeSSO && window.GrudgeSSO.appendToken) {
          // grudge-sso may rewrite on navigation
        }
      });
    }
  }

  function mount(selector, opts) {
    opts = opts || {};
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    loadConfig().then(function () {
      if (isSignedIn()) {
        fetchPlayerData().finally(function () { renderCard(el, opts); });
      } else {
        renderCard(el, opts);
      }
    });
  }

  function autoMount(opts) {
    opts = opts || {};
    injectStyles();
    var wrap = document.createElement('div');
    wrap.className = 'gfc-pill';
    wrap.innerHTML = '<button class="gfc-pill-btn" type="button">⚔ Fleet</button><div class="gfc-pill-panel"><div id="gfc-pill-inner"></div></div>';
    document.body.appendChild(wrap);

    var btn = wrap.querySelector('.gfc-pill-btn');
    var panel = wrap.querySelector('.gfc-pill-panel');
    var inner = wrap.querySelector('#gfc-pill-inner');

    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      if (open && !inner.hasChildNodes()) mount(inner, opts);
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) panel.classList.remove('open');
    });
  }

  function refresh() {
    characters = null;
    homeIslandId = null;
    var containers = document.querySelectorAll('[data-grudge-fleet-connect]');
    for (var i = 0; i < containers.length; i++) mount(containers[i]);
  }

  window.GrudgeFleetConnect = {
    mount: mount,
    autoMount: autoMount,
    refresh: refresh,
    isSignedIn: isSignedIn,
    ssoUrl: ssoUrl,
    getConfig: loadConfig,
    getCharacters: function () { return characters || []; },
    getActiveId: readActiveId,
    getActiveCharacter: function () { return resolveActiveChar(characters); },
    decodeGrdgCharId: decodeGrdgCharId,
    selectCharacter: function (id) {
      saveActiveId(id);
      document.dispatchEvent(new CustomEvent('grudge:character:updated', {
        detail: { character: resolveActiveChar(characters), characters: characters }
      }));
      refresh();
    }
  };

  document.addEventListener('grudge-auth-changed', refresh);
})();