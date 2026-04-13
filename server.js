const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

// Database connection module (Postgres + Redis)
const db = require('./lib/db');

// Import Vercel-compatible handlers (work as Express route handlers)
const vibeProvidersHandler = require('./api/vibe/providers');
const vibeChatHandler = require('./api/vibe/chat');
const sdkInfoHandler = require('./api/sdk/info');
const storageInfoHandler = require('./api/storage/info');
const storageListHandler = require('./api/storage/list');

// New expansion routers
const gdevelopRouter  = require('./api/gdevelop/config');
const platformRouter  = require('./api/platform/index');
const gamesRouter     = require('./api/games/sessions');
const accountsRouter  = require('./api/accounts/index');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';
const GAME_API = process.env.GAME_API_URL || 'https://api.grudge-studio.com';
const SESSION_SECRET = process.env.SESSION_SECRET || 'grudge-warlords-secret-key';

// â”€â”€ JWT Auth Middleware (hub-and-spoke: verify against auth-gateway) â”€â”€

let jwt;
try { jwt = require('jsonwebtoken'); } catch { jwt = null; }

/** Verify JWT locally, then fall back to remote auth-gateway /api/verify. */
async function verifyGrudgeToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);

  // Fast path: local JWT decode
  if (jwt) {
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      if (decoded.grudgeId) {
        req.grudgeUser = { grudgeId: decoded.grudgeId, username: decoded.username, userId: decoded.userId };
        return next();
      }
    } catch { /* fall through to remote */ }
  }

  // Slow path: call auth-gateway /api/verify
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await _fetch(`${AUTH_GATEWAY}/api/verify`, {
      headers: { Authorization: authHeader },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.grudgeId) {
        req.grudgeUser = {
          grudgeId: data.grudgeId,
          username: data.username || data.user?.username,
          userId: data.user?.id || data.grudgeId,
          role: data.user?.role
        };
        return next();
      }
    }
  } catch { /* auth-gateway unreachable */ }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

/** Optional auth â€” continues even if no valid token. */
async function optionalGrudgeAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Reuse the same logic but don't block
      await new Promise((resolve) => {
        verifyGrudgeToken(req, { status: () => ({ json: () => {} }) }, resolve);
      });
    } catch { /* continue unauthenticated */ }
  }
  next();
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: [
    // Grudge Studio external domains
    'https://grudgewarlords.com',
    'https://www.grudgewarlords.com',
    'https://warlord-crafting-suite.vercel.app',
    'https://grudachain.grudgestudio.com',
    'https://id.grudge-studio.com',
    'https://api.grudge-studio.com',
    'https://dash.grudge-studio.com',
    'https://account.grudge-studio.com',
    'https://grudge-platform.vercel.app',
    'https://gdevelop-assistant.vercel.app',
    'https://dungeon-crawler-quest.vercel.app',
    // Regex patterns — Vercel previews, all Grudge Studio subdomains, Railway internal
    /\.vercel\.app$/,
    /\.grudgestudio\.com$/,
    /\.grudge-studio\.com$/,
    /\.railway\.internal$/,
    /\.up\.railway\.app$/,
    /localhost/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Redirect /favicon.ico â†’ /favicon.png (browsers request .ico by default)
app.get('/favicon.ico', (req, res) => {
  res.redirect(301, '/favicon.png');
});

// AI Services Configuration
const aiServices = {
  puter: {
    enabled: true,
    url: 'https://js.puter.com/v2/',
    models: ['claude-3-5-sonnet', 'gpt-4o', 'o3-mini', 'gemini-pro'],
    status: 'initializing'
  },
  huggingface: {
    enabled: true,
    url: 'https://api-inference.huggingface.co',
    models: ['microsoft/DialoGPT-medium', 'gpt2', 'distilbert-base-uncased'],
    status: 'initializing'
  },
  openrouter: {
    enabled: true,
    url: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.1-8b-instruct:free', 'microsoft/phi-3-mini-128k-instruct:free'],
    status: 'initializing'
  },
  local: {
    enabled: true,
    models: ['local-gpt', 'fallback-ai'],
    status: 'ready'
  }
};

// System status
const SERVER_START_TIME = Date.now();
let systemStatus = {
  server: 'starting',
  ai: 'initializing',
  network: 'connecting',
  storage: 'ready'
};

// Health check endpoint
app.get('/health', (req, res) => {
  const uptimeMs = Date.now() - SERVER_START_TIME;
  const dbStatus = db.getStatus();
  res.json({
    status: 'healthy',
    uptime: uptimeMs,
    uptimeHuman: formatUptime(uptimeMs),
    services: aiServices,
    system: systemStatus,
    databases: {
      postgres: dbStatus.postgres,
      redis: dbStatus.redis,
      postgresError: dbStatus.postgresError || undefined,
      redisError: dbStatus.redisError || undefined
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    system: systemStatus,
    ai: aiServices,
    timestamp: new Date().toISOString()
  });
});

// AI Chat endpoint with multiple fallbacks
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'auto', temperature = 0.7 } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response = null;
    let usedService = null;

    // Try Puter.js first (free unlimited)
    if (aiServices.puter.status === 'ready') {
      try {
        response = await callPuterAI(message, model, temperature);
        usedService = 'puter';
      } catch (error) {
        console.warn('Puter AI failed:', error.message);
      }
    }

    // Fallback to HuggingFace
    if (!response && aiServices.huggingface.status === 'ready') {
      try {
        response = await callHuggingFaceAI(message, model);
        usedService = 'huggingface';
      } catch (error) {
        console.warn('HuggingFace AI failed:', error.message);
      }
    }

    // Fallback to OpenRouter
    if (!response && aiServices.openrouter.status === 'ready') {
      try {
        response = await callOpenRouterAI(message, model);
        usedService = 'openrouter';
      } catch (error) {
        console.warn('OpenRouter AI failed:', error.message);
      }
    }

    // Final fallback to local AI
    if (!response) {
      response = generateLocalResponse(message);
      usedService = 'local';
    }

    res.json({
      success: true,
      response,
      service: usedService,
      model: model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      fallback: generateLocalResponse(req.body.message || 'Hello'),
      timestamp: new Date().toISOString()
    });
  }
});

// Code generation endpoint
app.post('/api/generate-code', async (req, res) => {
  try {
    const { description, language = 'javascript', framework = 'vanilla' } = req.body;
    
    const prompt = `Generate ${language} code for: ${description}
    
Requirements:
- Use ${framework} framework
- Include error handling
- Add comments and documentation
- Follow best practices
- Make it production-ready

Return only the code, no explanations.`;

    const response = await callBestAvailableAI(prompt, 'claude-3-5-sonnet');
    
    res.json({
      success: true,
      code: response,
      language,
      framework,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({
      error: 'Code generation failed',
      fallback: generateCodeFallback(req.body.description, req.body.language)
    });
  }
});

// File analysis endpoint
app.post('/api/analyze-file', async (req, res) => {
  try {
    const { content, filename, type } = req.body;
    
    const prompt = `Analyze this ${type || 'file'} (${filename}):

${content}

Provide:
1. Code quality assessment
2. Security analysis
3. Performance recommendations
4. Best practices suggestions
5. Potential improvements

Be concise but thorough.`;

    const analysis = await callBestAvailableAI(prompt, 'claude-3-5-sonnet');
    
    res.json({
      success: true,
      analysis,
      filename,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({
      error: 'File analysis failed',
      fallback: `Basic analysis for ${req.body.filename}: File appears to be valid ${req.body.type} code.`
    });
  }
});

// Network discovery endpoint
app.get('/api/network/discover', (req, res) => {
  res.json({
    success: true,
    nodes: [
      {
        id: 'local',
        name: 'Local Node',
        status: 'active',
        services: ['ai', 'storage', 'compute'],
        endpoint: `http://localhost:${PORT}`
      }
    ],
    timestamp: new Date().toISOString()
  });
});

// ─── Database Status Endpoint ───
app.get('/api/db/status', (req, res) => {
  const dbStatus = db.getStatus();
  res.json({
    success: true,
    databases: {
      postgres: {
        status: dbStatus.postgres,
        error: dbStatus.postgresError || undefined
      },
      redis: {
        status: dbStatus.redis,
        error: dbStatus.redisError || undefined
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ─── Service Registry (Redis-backed, 5-minute TTL) ───

const SERVICE_TTL_SECONDS = 300; // 5 minutes
const SERVICE_REGISTRY_KEY = 'gruda:services';

/**
 * POST /api/services/register
 * Body: { name, url, type, status, [metadata] }
 * Registers (or refreshes) a service entry in Redis.
 */
app.post('/api/services/register', async (req, res) => {
  const { name, url, type, status = 'active', metadata = {} } = req.body || {};

  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }

  const redis = db.getRedis();
  const entry = {
    name,
    url,
    type: type || 'service',
    status,
    metadata,
    registeredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SERVICE_TTL_SECONDS * 1000).toISOString()
  };

  if (redis && redis.isReady) {
    try {
      // Store each service under its own key with a TTL
      const fieldKey = `gruda:service:${name}`;
      await redis.set(fieldKey, JSON.stringify(entry), { EX: SERVICE_TTL_SECONDS });
      // Track all registered names in a set; refresh the set TTL on every write
      await redis.sAdd(SERVICE_REGISTRY_KEY, name);
      await redis.expire(SERVICE_REGISTRY_KEY, SERVICE_TTL_SECONDS * 2);

      console.log(`📡 Service registered: ${name} (${url})`);
      return res.json({ success: true, service: entry, ttl: SERVICE_TTL_SECONDS });
    } catch (err) {
      console.error('Service register Redis error:', err.message);
      // Fall through to in-memory fallback
    }
  }

  // In-memory fallback when Redis is unavailable
  if (!global._serviceRegistry) global._serviceRegistry = {};
  global._serviceRegistry[name] = entry;
  console.log(`📡 Service registered (in-memory): ${name} (${url})`);
  res.json({ success: true, service: entry, ttl: SERVICE_TTL_SECONDS, source: 'memory' });
});

/**
 * GET /api/services/discover
 * Returns all currently registered services.
 */
app.get('/api/services/discover', async (req, res) => {
  const redis = db.getRedis();

  if (redis && redis.isReady) {
    try {
      const names = await redis.sMembers(SERVICE_REGISTRY_KEY);
      const services = [];

      for (const name of names) {
        const raw = await redis.get(`gruda:service:${name}`);
        if (raw) {
          services.push(JSON.parse(raw));
        } else {
          // Entry expired — clean up the set
          await redis.sRem(SERVICE_REGISTRY_KEY, name).catch(() => {});
        }
      }

      return res.json({
        success: true,
        source: 'redis',
        services,
        count: services.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Service discover Redis error:', err.message);
      // Fall through to in-memory fallback
    }
  }

  // In-memory fallback
  const services = Object.values(global._serviceRegistry || {});
  res.json({
    success: true,
    source: 'memory',
    services,
    count: services.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/services/self
 * Returns gruda-legion's own configuration so other services can
 * bootstrap their connection to the hub.
 */
app.get('/api/services/self', (req, res) => {
  const dbStatus = db.getStatus();
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || (host.includes('railway') ? 'https' : 'http');

  res.json({
    success: true,
    service: {
      name: 'gruda-legion',
      url: `${proto}://${host}`,
      type: 'hub',
      status: systemStatus.server,
      platform: 'Railway',
      capabilities: ['ai', 'service-registry', 'websocket', 'storage', 'accounts', 'games', 'matchmaking', 'gdevelop', 'platform'],
      endpoints: {
        health:             '/health',
        status:             '/api/status',
        dbStatus:           '/api/db/status',
        vibeChat:           '/api/vibe/chat',
        vibeProviders:      '/api/vibe/providers',
        servicesRegister:   '/api/services/register',
        servicesDiscover:   '/api/services/discover',
        grudgeConfig:       '/api/grudge-studio/config',
        gdevelopConfig:     '/api/gdevelop/config',
        gdevelopGames:      '/api/gdevelop/games',
        gdevelopLaunch:     '/api/gdevelop/launch',
        platformConfig:     '/api/platform/config',
        platformFeatured:   '/api/platform/featured',
        gamesList:          '/api/games/list',
        gamesSession:       '/api/games/session/create',
        matchmakingQueue:   '/api/games/matchmaking/queue',
        accountsMe:         '/api/accounts/me',
        accountsRegister:   '/api/accounts/register',
        accountsLinkPuter:  '/api/accounts/link/puter'
      }
    },
    config: {
      authGateway: AUTH_GATEWAY,
      gameApi:     GAME_API
    },
    databases: {
      postgres: dbStatus.postgres,
      redis:    dbStatus.redis
    },
    timestamp: new Date().toISOString()
  });
});


// â”àâ”àâ”à Vibe AI Routes (ported from Vercel serverless functions) â”àâ”àâ”à
app.get('/api/vibe/providers', vibeProvidersHandler);
app.post('/api/vibe/chat', vibeChatHandler);
app.options('/api/vibe/chat', vibeChatHandler); // CORS preflight

// â”àâ”àâ”à SDK Info Route â”àâ”àâ”à
app.get('/api/sdk/info', sdkInfoHandler);

// â”àâ”àâ”à Storage Routes â”àâ”àâ”à
app.get('/api/storage/info', storageInfoHandler);
app.get('/api/storage/list', storageListHandler);

// â”àâ”àâ”à Expansion Routers â”àâ”àâ”à
// GDevelop integration (launcher config, game list, launch tracking)
app.use('/api/gdevelop', gdevelopRouter);
// Grudge Platform (featured content, platform config)
app.use('/api/platform', platformRouter);
// Game sessions & matchmaking
app.use('/api/games', gamesRouter);
// Accounts system — inject verifyGrudgeToken so /me routes are auth-protected
app.use('/api/accounts', (req, res, next) => {
  // Attach the server's JWT middleware to req so route handlers can use it
  req._verifyToken = verifyGrudgeToken;
  next();
}, accountsRouter);

// â”€â”€â”€ Grudge Studio Integration Endpoints â”€â”€â”€
app.get('/api/grudge-studio/config', (req, res) => {
  res.json({
    success: true,
    ecosystem: {
      authGateway:  'https://id.grudge-studio.com',
      gameApi:      'https://api.grudge-studio.com',
      dashboard:    'https://dash.grudge-studio.com',
      wcs:          'https://warlord-crafting-suite.vercel.app',
      gge:          'https://grudgewarlords.com',
      grudaLegion:  'https://api.grudge-studio.com',
      grudachain:   'https://grudachain.grudgestudio.com',
      platform:     process.env.GRUDGE_PLATFORM_URL || 'https://grudge-platform.vercel.app',
      gdevelop:     process.env.GDEVELOP_URL        || 'https://gdevelop-assistant.vercel.app',
      dungeonCrawler: 'https://dungeon-crawler-quest.vercel.app'
    },
    sdk: {
      name: 'grudge-studio',
      version: '1.2.0',
      npm: 'https://www.npmjs.com/package/grudge-studio',
      github: 'https://github.com/MolochDaGod/GrudgeStudioNPM'
    },
    ai: {
      vibeVersion: '8.0.0',
      providers: ['megallm', 'openrouter', 'agentrouter', 'routeway'],
      puterAI: true
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/grudge-studio/links', (req, res) => {
  res.json({
    success: true,
    links: {
      main:          'https://grudgewarlords.com',
      wcs:           'https://warlord-crafting-suite.vercel.app',
      auth:          'https://id.grudge-studio.com',
      gameApi:       'https://api.grudge-studio.com',
      dashboard:     'https://dash.grudge-studio.com',
      legion:        'https://api.grudge-studio.com',
      grudachain:    'https://grudachain.grudgestudio.com',
      platform:      process.env.GRUDGE_PLATFORM_URL || 'https://grudge-platform.vercel.app',
      gdevelop:      process.env.GDEVELOP_URL        || 'https://gdevelop-assistant.vercel.app',
      dungeonCrawler:'https://dungeon-crawler-quest.vercel.app',
      npm:           'https://www.npmjs.com/package/grudge-studio',
      github:        'https://github.com/MolochDaGod/GrudgeStudioNPM',
      discord:       'https://discord.gg/FtGtmxmwkh'
    },
    timestamp: new Date().toISOString()
  });
});

// â”€â”€â”€ Admin / Stats Endpoints (auth-protected) â”€â”€â”€
app.get('/api/admin/stats', verifyGrudgeToken, (req, res) => {
  const connectedClients = io.engine.clientsCount || 0;
  res.json({
    success: true,
    stats: {
      uptime: Date.now() - SERVER_START_TIME,
      uptimeHuman: formatUptime(Date.now() - SERVER_START_TIME),
      connectedClients,
      serverStatus: systemStatus.server,
      aiStatus: systemStatus.ai,
      networkStatus: systemStatus.network,
      nodeEnv: NODE_ENV,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    },
    services: aiServices,
    vibeProviders: Object.entries(VIBE_PROVIDERS).map(([key, p]) => ({
      id: key,
      name: p.name,
      models: p.models,
      hasKey: !!p.key
    })),
    routes: [
      'GET /health', 'GET /api/status', 'GET /api/db/status',
      'POST /api/chat', 'POST /api/generate-code', 'POST /api/analyze-file',
      'GET /api/network/discover',
      'POST /api/services/register', 'GET /api/services/discover', 'GET /api/services/self',
      'GET /api/vibe/providers', 'POST /api/vibe/chat',
      'GET /api/sdk/info',
      'GET /api/storage/info', 'GET /api/storage/list',
      'GET /api/grudge-studio/config', 'GET /api/grudge-studio/links',
      'GET /api/gdevelop/config', 'GET /api/gdevelop/games', 'POST /api/gdevelop/launch',
      'GET /api/platform/config', 'GET /api/platform/featured', 'GET /api/platform/health',
      'GET /api/games/list', 'POST /api/games/session/create',
      'GET /api/games/session/:id', 'DELETE /api/games/session/:id',
      'GET /api/games/matchmaking/queue',
      'GET /api/accounts/me', 'PUT /api/accounts/me',
      'POST /api/accounts/register', 'POST /api/accounts/link/puter',
      'GET /api/accounts/:grudgeId/public',
      'GET /api/admin/stats', 'GET /api/admin/ecosystem'
    ],

    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/ecosystem', verifyGrudgeToken, async (req, res) => {
  const dbStatus = db.getStatus();

  // Fetch registered services from Redis (or in-memory fallback)
  let registeredServices = [];
  const redis = db.getRedis();
  if (redis && redis.isReady) {
    try {
      const names = await redis.sMembers(SERVICE_REGISTRY_KEY);
      for (const name of names) {
        const raw = await redis.get(`gruda:service:${name}`);
        if (raw) registeredServices.push(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Ecosystem Redis error:', err.message);
    }
  } else {
    registeredServices = Object.values(global._serviceRegistry || {});
  }

  res.json({
    success: true,
    ecosystem: {
      services: {
        grudaLegion: {
          url: 'https://api.grudge-studio.com',
          platform: 'Railway',
          status: systemStatus.server,
          uptime: Date.now() - SERVER_START_TIME
        },
        grudachain: {
          url: 'https://grudachain.grudgestudio.com',
          platform: 'Vercel',
          type: 'Serverless functions + static'
        },
        authGateway: {
          url: AUTH_GATEWAY,
          platform: 'Grudge Backend',
          type: 'Authentication & SSO gateway'
        },
        gameApi: {
          url: GAME_API,
          platform: 'Grudge Backend',
          type: 'Game API'
        },
        dashboard: {
          url: 'https://dash.grudge-studio.com',
          platform: 'Grudge Backend',
          type: 'Admin dashboard'
        },
        wcs: {
          url: 'https://warlord-crafting-suite.vercel.app',
          platform: 'Vercel',
          type: 'Game systems (crafting, battle, arsenal, dungeon)'
        },
        gge: {
          url: 'https://grudgewarlords.com',
          platform: 'Vercel',
          type: 'Main game portal + GDevelop Assistant'
        }
      },
      registeredServices,
      sdk: {
        'grudge-studio': { version: '1.2.0', npm: 'https://www.npmjs.com/package/grudge-studio' },
        '@grudge/puter-sync': { version: '1.0.0', description: 'Puter cloud sync bridge' }
      },
      ai: {
        vibeVersion: '8.0.0',
        providers: Object.keys(VIBE_PROVIDERS),
        puterAI: 'Client-side via puter.ai.chat() — free unlimited'
      },
      databases: {
        postgres: dbStatus.postgres,
        redis: dbStatus.redis,
        postgresError: dbStatus.postgresError || undefined,
        redisError: dbStatus.redisError || undefined
      },
      storage: {
        provider: 'Grudge ObjectStore (molochdagod.github.io/ObjectStore)',
        backend: 'https://api.grudge-studio.com',
        cdn: 'https://molochdagod.github.io/ObjectStore'
      },
      repo: {
        github: 'https://github.com/MolochDaGod/grudachain',
        branch: 'master',
        autoDeployTo: 'Railway'
      }
    },
    timestamp: new Date().toISOString()
  });
});

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}



// â”€â”€â”€ Real AI Provider Chain (from Vibe 8.0.0) â”€â”€â”€
// Keys read from env vars first, falling back to bundled defaults
const VIBE_PROVIDERS = {
  megallm: {
    name: 'MegaLLM',
    baseUrl: 'https://ai.megallm.io/v1',
    key: process.env.MEGALLM_API_KEY || '',
    models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-haiku', 'deepseek-chat']
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    key: process.env.OPENROUTER_API_KEY || '',
    models: ['meta-llama/llama-3.1-8b-instruct:free', 'microsoft/phi-3-mini-128k-instruct:free']
  },
  agentrouter: {
    name: 'AgentRouter',
    baseUrl: 'https://agentrouter.org/v1',
    key: process.env.AGENTROUTER_API_KEY || '',
    models: ['gpt-4o-mini', 'claude-3-haiku']
  },
  routeway: {
    name: 'Routeway',
    baseUrl: 'https://api.routeway.ai/v1',
    key: process.env.ROUTEWAY_API_KEY || '',
    models: ['gpt-4o-mini', 'claude-3-haiku']
  }
};

// Add OpenAI as a direct fallback if OPEN_AI_API key is set
if (process.env.OPEN_AI_API) {
  VIBE_PROVIDERS.openai = {
    name: 'OpenAI (Direct)',
    baseUrl: 'https://api.openai.com/v1',
    key: process.env.OPEN_AI_API,
    models: ['gpt-4o-mini', 'gpt-3.5-turbo']
  };
}

const VIBE_PROVIDER_ORDER = [
  'megallm', 'openrouter', 'agentrouter', 'routeway',
  ...(process.env.OPEN_AI_API ? ['openai'] : [])
];

async function callVibeProvider(providerKey, messages, model, temperature) {
  const provider = VIBE_PROVIDERS[providerKey];
  if (!provider) throw new Error(`Unknown provider: ${providerKey}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await _fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`,
        'HTTP-Referer': 'https://api.grudge-studio.com',
        'X-Title': 'GRUDA Legion Railway'
      },
      body: JSON.stringify({
        model: model || provider.models[0],
        messages,
        temperature: temperature || 0.7,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${provider.name} ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider.name} returned empty response`);

    return { content, provider: provider.name, model: data.model || model };
  } finally {
    clearTimeout(timeout);
  }
}

async function callBestAvailableAI(prompt, preferredModel) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant for Grudge Studio game development. You help with code generation, game design, Three.js, Socket.io, combat systems, terrain generation, and all aspects of building multiplayer 3D games.' },
    { role: 'user', content: prompt }
  ];

  for (const providerKey of VIBE_PROVIDER_ORDER) {
    try {
      const result = await callVibeProvider(providerKey, messages, preferredModel);
      return result.content;
    } catch (error) {
      console.warn(`Vibe provider ${providerKey} failed:`, error.message);
    }
  }

  // Final fallback to local
  return generateLocalResponse(prompt);
}

// Legacy /api/chat stub functions â€” now backed by real Vibe providers
async function callPuterAI(message, model, temperature) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant powered by Puter.js.' },
    { role: 'user', content: message }
  ];
  try {
    const result = await callVibeProvider('megallm', messages, model, temperature);
    return result.content;
  } catch (error) {
    throw new Error('MegaLLM (Puter fallback) failed: ' + error.message);
  }
}

async function callHuggingFaceAI(message, model) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: message }
  ];
  try {
    const result = await callVibeProvider('openrouter', messages, model);
    return result.content;
  } catch (error) {
    throw new Error('OpenRouter (HuggingFace fallback) failed: ' + error.message);
  }
}

async function callOpenRouterAI(message, model) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: message }
  ];
  try {
    const result = await callVibeProvider('agentrouter', messages, model);
    return result.content;
  } catch (error) {
    throw new Error('AgentRouter (OpenRouter fallback) failed: ' + error.message);
  }
}

function generateLocalResponse(message) {
  const responses = [
    `I understand you're asking about: "${message}". While AI services are connecting, I can provide basic assistance.`,
    `Regarding "${message}", I'm processing your request locally. AI services will enhance responses once connected.`,
    `Your query about "${message}" is noted. Local processing active, enhanced AI features loading.`,
    `Processing "${message}" locally. Full AI capabilities will be available shortly.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateCodeFallback(description, language) {
  return `// ${language} code for: ${description}
// Generated by GRUDA Legion local system
// TODO: Implement ${description}

function main() {
    console.log('${description} implementation needed');
    // Add your implementation here
}

main();`;
}

// WebSocket handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial status
  socket.emit('system-status', systemStatus);
  socket.emit('ai-services', aiServices);
  
  socket.on('chat-message', async (data) => {
    try {
      const response = await callBestAvailableAI(data.message, data.model);
      socket.emit('chat-response', {
        id: data.id,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('chat-error', {
        id: data.id,
        error: error.message
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Initialize AI services
async function initializeAIServices() {
  console.log('\u{1F916} Initializing AI services...');
  
  // Initialize Puter.js
  try {
    aiServices.puter.status = 'ready';
    console.log('\u2705 Puter.js AI service ready');
  } catch (error) {
    console.warn('\u26A0\uFE0F Puter.js initialization failed:', error.message);
    aiServices.puter.status = 'error';
  }
  
  // Initialize HuggingFace
  try {
    aiServices.huggingface.status = 'ready';
    console.log('\u2705 HuggingFace AI service ready');
  } catch (error) {
    console.warn('\u26A0\uFE0F HuggingFace initialization failed:', error.message);
    aiServices.huggingface.status = 'error';
  }
  
  // Initialize OpenRouter
  try {
    aiServices.openrouter.status = 'ready';
    console.log('\u2705 OpenRouter AI service ready');
  } catch (error) {
    console.warn('\u26A0\uFE0F OpenRouter initialization failed:', error.message);
    aiServices.openrouter.status = 'error';
  }
  
  systemStatus.ai = 'ready';
  console.log('\u{1F389} All AI services initialized');
}

// Start server — initialise databases first, then bind the HTTP port
(async () => {
  // ── Database init (non-blocking: server starts even if DBs are down) ──
  console.log('\uD83D\uDD27 Initializing database connections...');
  await db.init();

  // ── Bind HTTP server ──
  server.listen(PORT, async () => {
    console.log(`
  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557     \u2588\u2588\u2557     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2557
 \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557    \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551
 \u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551    \u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551
 \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551    \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2557\u2588\u2588\u2551
 \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551 \u255A\u2588\u2588\u2588\u2588\u2551
  \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u2550\u2550\u255D
  `);

    console.log('\uD83D\uDE80 GRUDA Legion Server Started');
    console.log(`\uD83D\uDCE1 Server running on http://localhost:${PORT}`);
    console.log(`\uD83C\uDF10 Environment: ${NODE_ENV}`);
    console.log(`\u26A1 Free AI services enabled`);

    systemStatus.server = 'running';
    systemStatus.network = 'connected';

    // Initialize AI services
    await initializeAIServices();

    // Log database status after init
    const dbStatus = db.getStatus();
    console.log(`\uD83D\uDDC4\uFE0F  PostgreSQL: ${dbStatus.postgres}`);
    console.log(`\uD83D\uDD34 Redis:      ${dbStatus.redis}`);

    console.log(`
\uD83C\uDFAF Access Points:
\u2022 Main Interface: http://localhost:${PORT}
\u2022 Health Check:   http://localhost:${PORT}/health
\u2022 API Status:     http://localhost:${PORT}/api/status
\u2022 DB Status:      http://localhost:${PORT}/api/db/status
\u2022 Vibe Providers: http://localhost:${PORT}/api/vibe/providers
\u2022 Vibe Chat:      http://localhost:${PORT}/api/vibe/chat
\u2022 SDK Info:       http://localhost:${PORT}/api/sdk/info
\u2022 Grudge Config:  http://localhost:${PORT}/api/grudge-studio/config
\u2022 Storage Info:   http://localhost:${PORT}/api/storage/info
\u2022 Svc Register:   http://localhost:${PORT}/api/services/register
\u2022 Svc Discover:   http://localhost:${PORT}/api/services/discover
\u2022 Svc Self:       http://localhost:${PORT}/api/services/self
\u2022 Admin Stats:    http://localhost:${PORT}/api/admin/stats
\u2022 Admin Ecosystem:http://localhost:${PORT}/api/admin/ecosystem
\u2022 WebSocket:      ws://localhost:${PORT}

\uD83E\uDD16 Vibe 8.0.0 AI Providers (Real):
\u2022 MegaLLM (gpt-4o-mini, claude-3-haiku) - Free
\u2022 OpenRouter (llama-3.1, phi-3) - Free
\u2022 AgentRouter (gpt-4o-mini, claude-3-haiku) - Free
\u2022 Routeway (gpt-4o-mini, claude-3-haiku) - Free
\u2022 Puter.js (Claude, GPT-4o) - Client-side
\u2022 Local AI Fallback - Always available

\uD83C\uDFAE Grudge Studio Ecosystem:
\u2022 Auth (SSO):     ${AUTH_GATEWAY}
\u2022 Game API:       ${GAME_API}
\u2022 Dashboard:      https://dash.grudge-studio.com
\u2022 WCS:            https://warlord-crafting-suite.vercel.app
\u2022 GGE:            https://grudgewarlords.com

\u2705 GRUDA Legion is fully operational!
  `);
  });
})().catch((err) => {
  console.error('\u274C Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown (SIGINT for local dev, SIGTERM for Railway/Docker)
function gracefulShutdown(signal) {
  console.log(`\n\uD83D\uDED1 ${signal} received — shutting down GRUDA Legion server...`);
  server.close(async () => {
    await db.close();
    console.log('\u2705 Server closed gracefully');
    process.exit(0);
  });
  // Force exit after 10s if connections hang
  setTimeout(() => {
    console.error('\u26A0\uFE0F Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('\u274C Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\u274C Unhandled Rejection at:', promise, 'reason:', reason);
  // Log only — do not crash the process for transient async failures
});

module.exports = app;
