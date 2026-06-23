/** AnythingLLM Developer API — server-side only (never expose API key to browsers) */

const BASE_URL = (process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_KEY = process.env.ANYTHINGLLM_API_KEY || '';
const DEFAULT_WORKSPACE = process.env.ANYTHINGLLM_DEFAULT_WORKSPACE || 'grudge-fleet';

function headers(json = true) {
  const h = { Authorization: `Bearer ${API_KEY}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function request(path, init) {
  if (!API_KEY) throw new Error('ANYTHINGLLM_API_KEY is not configured');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    signal: init?.signal || AbortSignal.timeout(120000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AnythingLLM ${path} failed (${res.status}): ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

function getConfig() {
  return {
    baseUrl: BASE_URL,
    defaultWorkspace: DEFAULT_WORKSPACE,
    configured: Boolean(API_KEY),
    uiUrl: BASE_URL.replace(/\/api$/, '')
  };
}

async function checkStatus() {
  if (!API_KEY) {
    return { online: false, authenticated: false, workspaces: [], error: 'missing_api_key' };
  }
  try {
    const auth = await request('/v1/auth', { method: 'GET' });
    const list = await request('/v1/workspaces', { method: 'GET' });
    return {
      online: true,
      authenticated: !!auth.authenticated,
      workspaces: (list.workspaces || []).map(w => w.slug),
      error: null
    };
  } catch (err) {
    return { online: false, authenticated: false, workspaces: [], error: err.message };
  }
}

function resolveWorkspace(task) {
  switch (task) {
    case 'game':
    case 'crafting':
    case 'items':
      return 'grudge-game-data';
    case 'supabase':
    case 'database':
    case 'schema':
      return 'grudge-supabase';
    case 'code':
    case 'debug':
    case 'api':
      return 'grudge-backend';
    case 'telegram':
    case 'bot':
      return 'grudachainbot';
    case 'fleet':
    case 'deploy':
    case 'infra':
    case 'mismatch':
      return 'grudge-fleet';
    default:
      return DEFAULT_WORKSPACE;
  }
}

async function workspaceChat({ workspace, message, mode = 'query', sessionId }) {
  const slug = workspace || DEFAULT_WORKSPACE;
  return request(`/v1/workspace/${slug}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, mode, sessionId })
  });
}

module.exports = {
  getConfig,
  checkStatus,
  resolveWorkspace,
  workspaceChat,
  BASE_URL,
  API_KEY,
  DEFAULT_WORKSPACE
};