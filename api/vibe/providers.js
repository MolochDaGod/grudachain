module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    source: 'vibe-8.0.0',
    description: 'Free AI providers from Vibe 8.0.0 AI Development Platform — 4 providers, 27+ models, no API keys needed',
    providers: {
      megallm: {
        name: 'MegaLLM',
        status: 'active',
        models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-haiku', 'deepseek-chat'],
        free: true
      },
      openrouter: {
        name: 'OpenRouter',
        status: 'active',
        models: ['meta-llama/llama-3.1-8b-instruct:free', 'microsoft/phi-3-mini-128k-instruct:free'],
        free: true
      },
      agentrouter: {
        name: 'AgentRouter',
        status: 'active',
        models: ['gpt-4o-mini', 'claude-3-haiku'],
        free: true
      },
      routeway: {
        name: 'Routeway',
        status: 'active',
        models: ['gpt-4o-mini', 'claude-3-haiku'],
        free: true
      }
    },
    tools: [
      'Code Quality Analyzer', 'Smart Refactoring', 'Auto Test Generator',
      'Bundle Optimizer', 'Security Scanner', 'Performance Benchmark',
      'Documentation Generator', 'Code Migrator'
    ],
    download: '/downloads/vibe-8.0.0.zip',
    timestamp: new Date().toISOString()
  });
};
