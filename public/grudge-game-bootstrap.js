/**
 * grudge-game-bootstrap.js — Fleet production bootstrap for Grudge Studio games
 *
 * Load early in <head> on every game / portal HTML entry point:
 *   <script src="/grudge-game-bootstrap.js"></script>
 *
 * - Disables browser auto-translate (prevents Microsoft Translator 401 console noise)
 * - Handles Grudge ID SSO return (?grudge_token= / ?puter_token=)
 * - Bridges launch tokens via same-origin /api/auth/* proxies (avoids CORS)
 * - Listens for grudge-auth:success postMessage from id.grudge-studio.com popups
 * - Exposes window.GRUDGE_FLEET endpoints + window.GrudgeGameBootstrap session helpers
 */
(function (global) {
  'use strict';

  try {
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
    if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
      var meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      (document.head || document.documentElement).appendChild(meta);
    }
  } catch (e) {}

  var TOKEN_KEY = 'grudge_auth_token';
  var ID_KEY = 'grudge_id';
  var USER_KEY = 'grudge_username';
  var USERID_KEY = 'grudge_user_id';
  var ACCOUNT_KEY = 'grudge_account_id';

  var authPending = false;
  var readyPromise = null;

  var FLEET = {
    auth: 'https://id.grudge-studio.com',
    api: 'https://api.grudge-studio.com',
    account: 'https://account.grudge-studio.com',
    assets: 'https://assets.grudge-studio.com',
    objectstore: 'https://objectstore.grudge-studio.com',
    ai: 'https://ai.grudge-studio.com',
    ws: 'wss://ws.grudge-studio.com',
    portal: 'https://client.grudge-studio.com',
    puterSdk: 'https://js.puter.com/v2/'
  };

  function dispatchAuthReady(detail) {
    document.dispatchEvent(new CustomEvent('grudge-auth-changed'));
    global.dispatchEvent(new CustomEvent('grudge-auth:success', { detail: detail || getSession() }));
    global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: detail || getSession() }));
  }

  function getSession() {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      grudgeId: localStorage.getItem(ID_KEY),
      username: localStorage.getItem(USER_KEY),
      userId: localStorage.getItem(USERID_KEY),
      signedIn: !!localStorage.getItem(TOKEN_KEY)
    };
  }

  function saveSession(data) {
    if (!data) return;
    var user = data.user || data.player || data.profile || null;
    var token = data.token || data.sessionToken || data.access_token || data.sso_token || (user && user.token);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    var gid = data.grudge_id || data.grudgeId || (user && (user.grudgeId || user.grudge_id));
    if (gid) {
      localStorage.setItem(ID_KEY, gid);
      localStorage.setItem(ACCOUNT_KEY, gid);
    }
    var uid = data.id || data.userId || (user && user.id);
    if (uid) localStorage.setItem(USERID_KEY, String(uid));
    var name = data.username || data.displayName || (user && (user.username || user.displayName));
    if (name) localStorage.setItem(USER_KEY, name);
    try {
      var maxAge = 7 * 24 * 60 * 60;
      if (token) {
        document.cookie = TOKEN_KEY + '=' + encodeURIComponent(token) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
      }
      if (gid) {
        document.cookie = ID_KEY + '=' + encodeURIComponent(gid) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
      }
    } catch (e) {}
  }

  function clearSession() {
    [TOKEN_KEY, ID_KEY, USER_KEY, USERID_KEY, ACCOUNT_KEY, 'grudge_user', 'grudge_session_token'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    document.dispatchEvent(new CustomEvent('grudge-auth-changed'));
  }

  function buildLoginUrl(app, returnUrl) {
    return FLEET.auth + '/api/auth/page?app=' +
      encodeURIComponent(app || 'grudge-game') +
      '&redirect=' + encodeURIComponent(returnUrl || location.href.split('#')[0]);
  }

  function openLogin(app) {
    var url = buildLoginUrl(app);
    var w = 480;
    var h = 640;
    var left = Math.max(0, (screen.width - w) / 2);
    var top = Math.max(0, (screen.height - h) / 2);
    global.open(url, 'grudge-id-login',
      'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',noopener');
  }

  function exchangeLaunchToken(launchToken) {
    authPending = true;
    var body = JSON.stringify({ token: launchToken, audience: location.origin });
    var paths = [
      '/api/auth/grudge-bridge',
      '/api/auth/session/exchange',
      FLEET.auth + '/api/auth/session/exchange'
    ];
    var chain = Promise.resolve(false);
    paths.forEach(function (path) {
      chain = chain.then(function (done) {
        if (done) return true;
        return fetch(path, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': location.origin
          },
          body: body
        })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (profile) {
            if (!profile) return false;
            var jwt = profile.token || profile.sessionToken;
            if (!jwt) return false;
            saveSession(profile);
            dispatchAuthReady(getSession());
            return true;
          })
          .catch(function () { return false; });
      });
    });
    return chain.finally(function () { authPending = false; });
  }

  function handleSsoCallback() {
    try {
      var params = new URLSearchParams(location.search);
      var launchToken = params.get('grudge_token') || params.get('puter_token');
      if (launchToken) {
        ['grudge_token', 'puter_token', 'auth', 'new'].forEach(function (k) { params.delete(k); });
        var qs = params.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        return exchangeLaunchToken(launchToken).then(function (ok) { return ok ? true : 'failed'; });
      }
      var token = params.get('sso_token') || params.get('token');
      if (!token) return Promise.resolve(false);
      saveSession({
        token: token,
        grudge_id: params.get('grudge_id') || params.get('grudgeId'),
        username: params.get('username') || params.get('grudge_username'),
        id: params.get('grudge_user_id')
      });
      ['sso_token', 'token', 'grudge_id', 'grudgeId', 'username', 'grudge_username', 'grudge_user_id'].forEach(function (k) {
        params.delete(k);
      });
      var qs2 = params.toString();
      history.replaceState(null, '', location.pathname + (qs2 ? '?' + qs2 : '') + location.hash);
      dispatchAuthReady(getSession());
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function listenAuthPopup() {
    global.addEventListener('message', function (ev) {
      var data = ev.data;
      if (!data) return;
      if (data.type !== 'grudge-auth:success' && data.type !== 'GRUDGE_AUTH_SUCCESS') return;
      try {
        var origin = ev.origin || '';
        if (origin &&
            origin.indexOf('grudge-studio.com') < 0 &&
            origin.indexOf('grudgewarlords.com') < 0 &&
            origin.indexOf('vercel.app') < 0 &&
            origin.indexOf('puter.site') < 0) {
          return;
        }
      } catch (e) {}
      saveSession(data.payload || data);
      dispatchAuthReady(getSession());
    });
  }

  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {});
    var sess = getSession();
    if (sess.token && !opts.headers.Authorization) {
      opts.headers.Authorization = 'Bearer ' + sess.token;
    }
    var url = path.indexOf('http') === 0 ? path : '/api' + (path.charAt(0) === '/' ? path : '/' + path);
    return fetch(url, opts);
  }

  function whenReady() {
    return readyPromise || Promise.resolve(getSession().signedIn);
  }

  listenAuthPopup();
  readyPromise = handleSsoCallback();

  global.GRUDGE_FLEET = FLEET;
  global.GrudgeGameBootstrap = {
    fleet: FLEET,
    get authPending() { return authPending; },
    whenReady: whenReady,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    buildLoginUrl: buildLoginUrl,
    openLogin: openLogin,
    apiFetch: apiFetch,
    exchangeLaunchToken: exchangeLaunchToken
  };
})(typeof window !== 'undefined' ? window : this);