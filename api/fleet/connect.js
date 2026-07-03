/**
 * GET /api/fleet/connect
 * Canonical fleet connectivity manifest for embeddable widgets and launchers.
 */
const {
  CANONICAL,
  NEXUS_CANONICAL,
  NEXUS_ALIASES,
  NEXUS_ORIGIN,
  islandHub,
} = require('../_lib/canonical-urls');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const nexus = NEXUS_ORIGIN;

  res.json({
    success: true,
    version: '2.1.0',
    nexus: {
      canonical: NEXUS_CANONICAL,
      aliases: NEXUS_ALIASES,
      origin: nexus
    },
    sdk: `${nexus}/grudge-fleet-sdk.js`,
    widget: `${nexus}/grudge-fleet-connect.js`,
    sso: `${nexus}/grudge-sso.js`,
    standards: {
      pattern: 'oauth2-style',
      authLoginPath: '/api/auth/page',
      authLegacyPath: '/auth',
      redirectParam: 'redirect',
      tokenStorageKey: 'grudge_auth_token',
      idStorageKey: 'grudge_id',
      puterFlow: ['puter.auth.signIn', 'POST /api/auth/puter-sso', 'handoff grudge_token'],
      note: 'Never link to /auth — it serves a legacy SPA. Use /api/auth/page only.'
    },
    auth: {
      gateway: CANONICAL.auth,
      login: CANONICAL.authLogin,
      verify: `${CANONICAL.auth}/api/auth/verify`,
      puterSso: `${CANONICAL.auth}/api/auth/puter-sso`,
      sessionExchange: `${CANONICAL.auth}/api/auth/session/exchange`,
      account: `${CANONICAL.auth}/account`,
      gameDataPuter: `${CANONICAL.gameData}/api/auth/puter`
    },
    libraries: {
      gameLibrary: {
        id: 'grudgedot',
        canonical: true,
        url: CANONICAL.grudgedot,
        label: 'grudgeDot Game Library',
        description: 'Primary launcher — fleet SSO, characters, releases UI',
        auth: 'grudge-id'
      },
      releasesHub: {
        id: 'releases-hub',
        canonical: true,
        url: CANONICAL.releasesHub,
        fallback: CANONICAL.grudgedot,
        label: 'Grudge Releases (GitHub org)',
        description: 'GitHub Releases mirror — converges on grudgeDot; use gameLibrary when possible',
        auth: 'grudge-id'
      }
    },
    api: {
      game: CANONICAL.gameApi,
      gameData: CANONICAL.gameData,
      /** Same-origin proxies on Nexus (avoid CORS + dead edge API) */
      characters: `${nexus}/api/characters`,
      account: `${nexus}/api/account/me`,
      accountProfile: `${nexus}/api/account`,
      health: `${CANONICAL.gameData}/api/health`,
      assets: CANONICAL.assets,
      objectStore: CANONICAL.objectStore,
      objectStoreCatalog: `${CANONICAL.objectStore}/api/v1/catalog`,
      objectStoreDocs: 'https://info.grudge-studio.com/docs',
      ai: CANONICAL.legion,
      grudaAgent: CANONICAL.grudaAgent,
      rag: `${nexus}/api/ai/rag`,
      fleetMismatch: `${nexus}/api/fleet/mismatch`,
      ale: CANONICAL.ale
    },
    cloud: {
      puter: CANONICAL.puterCloud,
      puterSdk: 'https://js.puter.com/v2/',
      savesRoot: 'grudge-studio/player-data',
      assetsRoot: 'grudge-studio/assets',
      exportsRoot: 'grudge-studio/exports',
      backupsRoot: 'grudge-studio/backups',
      dashboardSource: `${nexus}/puter-cloud-dashboard.html`,
      perAccountDashboard: `${nexus}/puter-cloud-dashboard.html`,
      adminApp: 'https://grudge-cloud.puter.site'
    },
    playerHub: {
      characters: `${CANONICAL.charactersHub}`,
      island: islandHub(),
      homeIsland: `${CANONICAL.client}/island`,
      warlords: CANONICAL.grudgewarlords,
      wcs: `${CANONICAL.wcs}/dashboard`,
      saves: CANONICAL.gameData,
      account: CANONICAL.auth,
      wallet: `${CANONICAL.wcs}/wallet`
    },
    tools: {
      nexus: NEXUS_CANONICAL,
      grudgedot: CANONICAL.grudgedot,
      devTool: {
        label: 'Grudge Studio Forge',
        version: '0.4.0',
        download: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest',
        repo: 'https://github.com/MolochDaGod/grudge-dev-tool'
      },
      legion: CANONICAL.legion,
      grudaAgent: CANONICAL.grudaAgent,
      platform: CANONICAL.platform,
      launcher: CANONICAL.releasesHub,
      game: CANONICAL.game,
      dash: CANONICAL.dash,
      fleet: CANONICAL.fleet
    },
    quickLinks: [
      { id: 'sign-in', label: 'Grudge ID', icon: 'shield', url: CANONICAL.auth, category: 'auth' },
      { id: 'characters', label: 'My Characters', icon: 'user', url: CANONICAL.charactersHub, category: 'player' },
      { id: 'island', label: 'Home Island', icon: 'island', url: islandHub(), category: 'player' },
      { id: 'warlords', label: 'Play Warlords', icon: 'sword', url: CANONICAL.grudgewarlords, category: 'game' },
      { id: 'tactics', label: 'Grudge Tactics', icon: 'sword', url: CANONICAL.game, category: 'game' },
      { id: 'grudgedot', label: 'grudgeDot', icon: 'gamepad', url: CANONICAL.grudgedot, category: 'tool' },
      { id: 'nexus', label: 'Nexus Hub', icon: 'link', url: NEXUS_CANONICAL, category: 'tool' },
      { id: 'platform', label: 'Grudge Platform', icon: 'grid', url: CANONICAL.platform, category: 'tool' },
      { id: 'dev-tool', label: 'Studio Forge', icon: 'hammer', url: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest', category: 'tool' },
      { id: 'legion', label: 'Legion AI', icon: 'brain', url: CANONICAL.legion, category: 'ai' },
      { id: 'wcs', label: 'Crafting Suite', icon: 'craft', url: CANONICAL.wcs, category: 'game' },
      { id: 'puter-cloud', label: 'Puter Cloud', icon: 'cloud', url: CANONICAL.puterCloud, category: 'cloud' },
      { id: 'telegram', label: 'Telegram Bot', icon: 'chat', url: 'https://t.me/grudachainbot', category: 'social' },
      { id: 'ale', label: 'ALE Assistant', icon: 'brain', url: CANONICAL.ale, category: 'ai' }
    ],
    puterPaths: {
      profile: 'grudge_studio_profile',
      saves: 'grudge-studio/player-data',
      assets: 'grudge-studio/assets',
      gameData: 'grudge-studio/game-data',
      exports: 'grudge-studio/exports',
      backups: 'grudge-studio/backups'
    },
    rag: {
      provider: 'anythingllm',
      workspaces: ['grudge-fleet', 'grudge-game-data', 'grudge-backend', 'grudge-supabase', 'grudachainbot'],
      defaultWorkspace: 'grudge-fleet',
      chatEndpoint: '/api/ai/rag/chat',
      statusEndpoint: '/api/ai/rag/status'
    },
    ssoDomains: [
      'nexus.grudge-studio.com',
      'grudachain.grudge-studio.com',
      'platform.grudge-studio.com',
      'apps.grudge-studio.com',
      'coder.grudge-studio.com',
      'wcs.grudge-studio.com',
      'client.grudge-studio.com',
      'game.grudge-studio.com',
      'dash.grudge-studio.com',
      'grudgewarlords.com',
      'id.grudge-studio.com',
      'grudge-studio.puter.site',
      'ale.grudge-studio.com'
    ],
    timestamp: new Date().toISOString()
  });
};