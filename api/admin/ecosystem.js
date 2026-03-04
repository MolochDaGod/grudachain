const _fetch = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || 'https://auth-gateway-flax.vercel.app';

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const resp = await _fetch(`${AUTH_GATEWAY}/api/verify`, {
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
          url: 'https://grudachain-rho.vercel.app',
          platform: 'Vercel',
          type: 'Nexus hub + serverless API'
        },
        authGateway: {
          url: AUTH_GATEWAY,
          platform: 'Vercel',
          type: 'Authentication (login/register/guest/verify/oauth)'
        },
        wcs: {
          url: 'https://warlord-crafting-suite.vercel.app',
          platform: 'Vercel',
          type: 'Game systems (crafting, battle, arsenal, dungeon, professions)'
        },
        gdevelop: {
          url: 'https://gdevelop-assistant.vercel.app',
          platform: 'Vercel',
          type: 'AI dev tools + game prototypes'
        },
        objectStore: {
          url: 'https://molochdagod.github.io/ObjectStore',
          platform: 'GitHub Pages',
          type: 'Game data API (weapons, armor, skills, sprites)'
        },
        grudaLegion: {
          url: 'https://gruda-legion-production.up.railway.app',
          platform: 'Railway',
          type: 'AI node + Socket.IO realtime'
        },
        platform: {
          url: 'https://grudge-platform.vercel.app',
          platform: 'Vercel',
          type: 'App launcher + operations hub'
        },
        puterCloud: {
          url: 'https://grudge-studio.puter.site',
          platform: 'Puter',
          type: 'Cloud AI + storage dashboard'
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
        provider: 'Puter Cloud (puter.fs + puter.kv)',
        hosting: 'Puter Hosting (*.puter.site)',
        supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured'
      },
      repo: {
        github: 'https://github.com/MolochDaGod/grudachain',
        branch: 'master'
      }
    },
    timestamp: new Date().toISOString()
  });
};
