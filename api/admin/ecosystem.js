const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const resp = await _fetch(`${AUTH_GATEWAY}/api/auth/verify`, {
      headers: { 'Authorization': authHeader }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;
    return {
      grudgeId: data.grudgeId,
      username: data.username || data.user?.username,
      role: data.user?.role || 'player'
    };
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await verifyAdmin(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  res.json({
    success: true,
    user,
    ecosystem: {
      services: {
        nexus: {
          url: 'https://nexus.grudge-studio.com',
          platform: 'Vercel',
          type: 'Nexus hub + serverless API'
        },
        authGateway: {
          url: AUTH_GATEWAY,
          platform: 'Grudge Backend (VPS)',
          type: 'Authentication (login/register/guest/verify/oauth)'
        },
        gameApi: {
          url: 'https://api.grudge-studio.com',
          platform: 'Grudge Backend (VPS)',
          type: 'Game API (characters, economy, crafting, islands)'
        },
        wcs: {
          url: 'https://grudgewarlords.com',
          platform: 'Vercel',
          type: 'Game systems (crafting, battle, arsenal, dungeon, professions)'
        },
        gdevelop: {
          url: 'https://coder.grudge-studio.com',
          platform: 'Vercel',
          type: 'AI dev tools + game prototypes'
        },
        objectStore: {
          url: 'https://objectstore.grudge-studio.com',
          platform: 'Cloudflare',
          type: 'Game data API (weapons, armor, skills, sprites)'
        },
        dashboard: {
          url: 'https://dash.grudge-studio.com',
          platform: 'Grudge Backend (VPS)',
          type: 'Admin dashboard + operations hub'
        }
      },
      sdk: {
        'grudge-studio': { version: '1.2.0', npm: 'https://www.npmjs.com/package/grudge-studio' },
        '@grudge/puter-sync': { version: '1.0.0', description: 'Puter cloud sync bridge' }
      },
      ai: {
        vibeVersion: '8.0.0',
        providers: ['megallm', 'openrouter', 'agentrouter', 'routeway'],
        puterAI: 'Client-side via puter.ai.chat() — free unlimited'
      },
      storage: {
        provider: 'Grudge Backend (VPS)',
        objectStore: 'https://objectstore.grudge-studio.com',
        dashboard: 'https://dash.grudge-studio.com'
      },
      repo: {
        github: 'https://github.com/MolochDaGod/grudachain',
        branch: 'master'
      }
    },
    timestamp: new Date().toISOString()
  });
};
