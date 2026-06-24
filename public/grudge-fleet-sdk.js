/**
 * grudge-fleet-sdk.js — Single entry point for Grudge Studio fleet apps
 *
 * Industry pattern: one runtime manifest (SSOT) + thin client SDK.
 *   Authorization Server: id.grudge-studio.com/api/auth/*
 *   Resource API:         api.grudge-studio.com
 *   Game Data (Postgres): grudge-builder-production.up.railway.app
 *
 * Usage (one script tag replaces hardcoded URLs + duplicate SSO copies):
 *   <script src="https://grudachain.grudge-studio.com/grudge-fleet-sdk.js"></script>
 *   <script>
 *     GrudgeFleet.init().then(function () {
 *       // GrudgeFleet.config.auth.login
 *       // GrudgeFleet.libraries.gameLibrary.url
 *       // GrudgeSSO.buildAuthUrl(location.href, 'my-app')
 *     });
 *   </script>
 */
(function () {
  'use strict';

  var NEXUS_CANONICAL = 'https://grudachain.grudge-studio.com';
  var NEXUS_FALLBACK = 'https://grudachain-rho.vercel.app';

  function resolveNexusOrigin() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('grudge-fleet-sdk.js') >= 0) {
        try { return new URL(src).origin; } catch (e) {}
      }
    }
    var host = location.hostname || '';
    if (host === 'grudachain.grudge-studio.com' || host === 'grudachain-rho.vercel.app') {
      return location.origin;
    }
    return NEXUS_FALLBACK;
  }

  var NEXUS_ORIGIN = resolveNexusOrigin();
  var MANIFEST_URL = NEXUS_ORIGIN + '/api/fleet/connect';
  var SSO_SCRIPT = NEXUS_ORIGIN + '/grudge-sso.js';
  var CONNECT_SCRIPT = NEXUS_ORIGIN + '/grudge-fleet-connect.js';
  var PUTER_SDK = 'https://js.puter.com/v2/';

  var manifest = null;
  var initPromise = null;

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadManifest(force) {
    if (manifest && !force) return Promise.resolve(manifest);
    return fetch(MANIFEST_URL, { signal: AbortSignal.timeout(8000) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        manifest = data && data.success !== false ? data : fallbackManifest();
        return manifest;
      })
      .catch(function () {
        manifest = fallbackManifest();
        return manifest;
      });
  }

  function fallbackManifest() {
    return {
      version: '2.0.0',
      auth: {
        gateway: 'https://id.grudge-studio.com',
        login: 'https://id.grudge-studio.com/api/auth/page',
        verify: 'https://id.grudge-studio.com/api/auth/verify',
        puterSso: 'https://id.grudge-studio.com/api/auth/puter-sso',
        sessionExchange: 'https://api.grudge-studio.com/api/auth/session/exchange'
      },
      api: { game: 'https://api.grudge-studio.com' },
      sso: SSO_SCRIPT,
      widget: CONNECT_SCRIPT,
      libraries: {
        gameLibrary: {
          id: 'grudgedot',
          canonical: true,
          url: 'https://gdevelop-assistant.vercel.app',
          label: 'grudgeDot Game Library',
          auth: 'grudge-id'
        },
        releasesHub: {
          id: 'releases-hub',
          canonical: false,
          url: 'https://launcher.grudge-studio.com',
          fallback: 'https://gdevelop-assistant.vercel.app',
          label: 'Grudge Releases (GitHub)',
          auth: 'grudge-id'
        }
      },
      standards: {
        authLoginPath: '/api/auth/page',
        authLegacyPath: '/auth',
        redirectParam: 'redirect',
        tokenStorageKey: 'grudge_auth_token',
        idStorageKey: 'grudge_id'
      }
    };
  }

  function normalizeConfig(m) {
    var auth = m.auth || {};
    return {
      version: m.version || '2.0.0',
      auth: {
        gateway: auth.gateway || 'https://id.grudge-studio.com',
        login: auth.login || 'https://id.grudge-studio.com/api/auth/page',
        verify: auth.verify || 'https://id.grudge-studio.com/api/auth/verify',
        puterSso: auth.puterSso || ((auth.gateway || 'https://id.grudge-studio.com') + '/api/auth/puter-sso'),
        sessionExchange: auth.sessionExchange || 'https://api.grudge-studio.com/api/auth/session/exchange'
      },
      api: m.api || { game: 'https://api.grudge-studio.com' },
      cloud: m.cloud || {},
      playerHub: m.playerHub || {},
      tools: m.tools || {},
      libraries: m.libraries || fallbackManifest().libraries,
      standards: m.standards || fallbackManifest().standards,
      sso: m.sso || SSO_SCRIPT,
      widget: m.widget || CONNECT_SCRIPT
    };
  }

  window.GrudgeFleet = {
    /** Load manifest + SSO + optional fleet-connect widget script */
    init: function (opts) {
      opts = opts || {};
      if (initPromise && !opts.force) return initPromise;
      initPromise = loadManifest(opts.force)
        .then(function (m) {
          window.GrudgeFleet.config = normalizeConfig(m);
          var chain = Promise.resolve();
          if (opts.sso !== false) chain = chain.then(function () { return injectScript(window.GrudgeFleet.config.sso); });
          if (opts.widget) chain = chain.then(function () { return injectScript(window.GrudgeFleet.config.widget); });
          if (opts.puter) chain = chain.then(function () { return injectScript(PUTER_SDK); });
          return chain.then(function () { return window.GrudgeFleet.config; });
        });
      return initPromise;
    },

    getManifest: loadManifest,
    config: null,

    /** Canonical login URL — never use bare /auth (legacy SPA) */
    loginUrl: function (returnUrl, app) {
      var c = window.GrudgeFleet.config || normalizeConfig(fallbackManifest());
      var u = c.auth.login.split('?')[0];
      return u + '?app=' + encodeURIComponent(app || 'fleet') +
        '&' + (c.standards.redirectParam || 'redirect') + '=' +
        encodeURIComponent(returnUrl || (typeof location !== 'undefined' ? location.href : ''));
    },

    libraries: {
      /** Primary SSO-integrated game library (grudgeDot) */
      gameLibrary: function () {
        var c = window.GrudgeFleet.config || normalizeConfig(fallbackManifest());
        return c.libraries.gameLibrary || fallbackManifest().libraries.gameLibrary;
      },
      /** GitHub releases browser — use fallback until launcher.grudge-studio.com ships */
      releasesHub: function () {
        var c = window.GrudgeFleet.config || normalizeConfig(fallbackManifest());
        var lib = c.libraries.releasesHub || fallbackManifest().libraries.releasesHub;
        return lib.url || lib.fallback;
      }
    },

    /** Redirect to Grudge ID login (OAuth-style authorization redirect) */
    signIn: function (app, returnUrl) {
      if (typeof window !== 'undefined') {
        window.location.href = window.GrudgeFleet.loginUrl(returnUrl, app);
      }
    }
  };
})();