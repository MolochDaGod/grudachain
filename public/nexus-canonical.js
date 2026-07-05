/**
 * Nexus canonical fleet URLs — client-side mirror of api/_lib/canonical-urls.js
 */
(function (global) {
  'use strict';

  var CANONICAL = {
    nexus: 'https://nexus.grudge-studio.com',
    platform: 'https://apps.grudge-studio.com',
    dash: 'https://dash.grudge-studio.com',
    fleet: 'https://fleet.grudge-studio.com',
    auth: 'https://id.grudge-studio.com',
    authLogin: 'https://id.grudge-studio.com/api/auth/page',
    gameApi: 'https://api.grudge-studio.com',
    gameData: 'https://grudge-api-production-0d46.up.railway.app',
    characters: 'https://character.grudge-studio.com',
    client: 'https://client.grudge-studio.com',
    objectStore: 'https://objectstore.grudge-studio.com',
    objectStoreDocs: 'https://info.grudge-studio.com/docs',
    assets: 'https://assets.grudge-studio.com',
    grudgewarlords: 'https://grudgewarlords.com',
    wcs: 'https://wcs.grudge-studio.com',
    grudgedot: 'https://coder.grudge-studio.com',
    releasesHub: 'https://launcher.grudge-studio.com',
    legion: 'https://ai.grudge-studio.com',
    grudaAgent: 'https://grudaagent.vercel.app',
    ale: 'https://ale.grudge-studio.com',
    puterCloud: 'https://grudge-studio.puter.site',
    superEngine: 'https://grudge-studio.com/super-engine',
    forgeDownload: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
    discord: 'https://discord.gg/FtGtmxmwkh',
    github: 'https://github.com/MolochDaGod',
    npm: 'https://www.npmjs.com/package/grudge-studio'
  };

  var HOST_REDIRECTS = {
    'grudachain.grudge-studio.com': CANONICAL.nexus,
    'platform.grudge-studio.com': CANONICAL.nexus,
    'grudachain.grudgestudio.com': CANONICAL.nexus,
    'grudachain-rho.vercel.app': CANONICAL.nexus,
    'grudachain.vercel.app': CANONICAL.nexus,
    'grudge-platform.vercel.app': CANONICAL.platform,
    'gdevelop-assistant.vercel.app': CANONICAL.grudgedot,
    'warlord-crafting-suite.vercel.app': CANONICAL.wcs
  };

  var URL_REWRITES = [
    ['https://grudachain.grudge-studio.com', CANONICAL.nexus],
    ['https://platform.grudge-studio.com', CANONICAL.nexus],
    ['https://grudachain.grudgestudio.com', CANONICAL.nexus],
    ['https://grudachain-app-gallery.vercel.app', CANONICAL.platform],
    ['https://grudge-platform.vercel.app', CANONICAL.platform],
    ['https://gdevelop-assistant.vercel.app', CANONICAL.grudgedot],
    ['https://warlord-crafting-suite.vercel.app', CANONICAL.wcs],
    ['https://molochdagod.github.io/ObjectStore', CANONICAL.objectStore],
    ['http://molochdagod.github.io/ObjectStore', CANONICAL.objectStore],
    ['https://client.grudge-studio.com/character', CANONICAL.characters]
  ];

  function redirectLegacyHost() {
    try {
      var host = location.hostname;
      var target = HOST_REDIRECTS[host];
      if (!target) return;
      var path = location.pathname + location.search + location.hash;
      if (path === '/') path = '/';
      location.replace(target + path);
    } catch (e) {}
  }

  function canonicalizeFleetUrl(url) {
    if (!url || url.charAt(0) === '/') return url;
    var out = String(url);
    for (var i = 0; i < URL_REWRITES.length; i++) {
      if (out.indexOf(URL_REWRITES[i][0]) === 0) {
        out = URL_REWRITES[i][1] + out.slice(URL_REWRITES[i][0].length);
      }
    }
    return out;
  }

  redirectLegacyHost();

  global.NEXUS_CANONICAL = {
    urls: CANONICAL,
    canonicalize: canonicalizeFleetUrl,
    islandHub: function () { return CANONICAL.wcs + '/island-hub'; }
  };
})(typeof window !== 'undefined' ? window : this);