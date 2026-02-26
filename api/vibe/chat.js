const fetch = require('node-fetch');

// Vibe 8.0.0 Free AI Providers — keys from vibe-cli open-source distribution
const PROVIDERS = {
  megallm: {
    name: 'MegaLLM',
    baseUrl: 'https://ai.megallm.io/v1',
    key: 'sk-mega-0eaa0b2c2bae3ced6afca8651cfbbce07927e231e4119068f7f7867c20cdc820',
    models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-haiku', 'deepseek-chat']
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    key: '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',
    models: ['meta-llama/llama-3.1-8b-instruct:free', 'microsoft/phi-3-mini-128k-instruct:free']
  },
  agentrouter: {
    name: 'AgentRouter',
    baseUrl: 'https://agentrouter.org/v1',
    key: 'sk-WXLlCAeAaDCeEjMWCBo7sqXGPOF1HrYEDm0JFBDXP3tEiERw',
    models: ['gpt-4o-mini', 'claude-3-haiku']
  },
  routeway: {
    name: 'Routeway',
    baseUrl: 'https://api.routeway.ai/v1',
    key: 'sk-LeRlb8aww5YXvdP57hnVw07xmIA2c3FvfeLvPhbmFU14osMn',
    models: ['gpt-4o-mini', 'claude-3-haiku']
  }
};

const PROVIDER_ORDER = ['megallm', 'openrouter', 'agentrouter', 'routeway'];

async function callProvider(providerKey, messages, model, temperature) {
  const provider = PROVIDERS[providerKey];
  if (!provider) throw new Error(`Unknown provider: ${providerKey}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`,
        'HTTP-Referer': 'https://grudachain.vercel.app',
        'X-Title': 'GrudaChain Grudge Studio'
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, messages, model, provider: preferredProvider, temperature, systemPrompt } = req.body;

    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'message or messages required' });
    }

    // Build messages array
    const chatMessages = messages || [];
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt });
    } else if (chatMessages.length === 0 || chatMessages[0]?.role !== 'system') {
      chatMessages.unshift({
        role: 'system',
        content: 'You are a helpful AI assistant for Grudge Studio game development. You help with code generation, game design, Three.js, Socket.io, combat systems, terrain generation, and all aspects of building multiplayer 3D games.'
      });
    }
    if (message) {
      chatMessages.push({ role: 'user', content: message });
    }

    // Try preferred provider first, then fallback through all providers
    const order = preferredProvider && PROVIDERS[preferredProvider]
      ? [preferredProvider, ...PROVIDER_ORDER.filter(p => p !== preferredProvider)]
      : PROVIDER_ORDER;

    let lastError = null;
    for (const providerKey of order) {
      try {
        const result = await callProvider(providerKey, chatMessages, model, temperature);
        return res.json({
          success: true,
          response: result.content,
          provider: result.provider,
          model: result.model,
          source: 'vibe-8.0.0',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn(`Vibe provider ${providerKey} failed:`, err.message);
        lastError = err;
      }
    }

    // All providers failed
    res.status(503).json({
      error: 'All AI providers temporarily unavailable',
      details: lastError?.message,
      providers: Object.keys(PROVIDERS),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vibe chat error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
