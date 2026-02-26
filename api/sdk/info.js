module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    packages: {
      'grudge-studio': {
        version: '1.2.0',
        description: 'Complete 3D Game Development SDK with Three.js, Socket.io, AI Assistance, and Deployment Tools',
        install: 'npm install grudge-studio',
        repository: 'https://github.com/MolochDaGod/GrudgeStudioNPM',
        modules: {
          core: 'Game engine core — scene management, entity system, physics',
          render: 'Rendering pipeline — Three.js shaders, lighting, post-processing',
          controllers: 'Character controllers — movement, camera, input handling',
          terrain: 'Procedural terrain generation — heightmaps, biomes, LOD',
          net: 'Networking layer — Socket.io multiplayer, state sync',
          ui: 'UI system — HUD, inventory, health bars, chat',
          assets: 'Asset management — loaders, caching, sprite sheets',
          docs: 'Documentation and guides',
          tools: 'Build tools, deployment scripts',
          playground: 'Interactive demo sandbox',
          'ai-agent': 'GrudgeStudioAgent — AI-powered game development assistant'
        },
        exports: {
          '.': './index.js',
          './core': './core/index.js',
          './render': './render/index.js',
          './controllers': './controllers/index.js',
          './terrain': './terrain/index.js',
          './net': './net/index.js',
          './ui': './ui/index.js',
          './assets': './assets/index.js',
          './ai-agent': './ai-agent/core/GrudgeStudioAgent.js'
        }
      },
      '@grudge/puter-sync': {
        version: '1.0.0',
        description: 'Puter cloud sync for Grudge Studio — bridges game data with Puter.js cloud storage',
        modules: {
          sync: 'Auto-sync game configs and player data to Puter cloud',
          backup: 'Automatic cloud backups via puter.fs',
          auth: 'Puter authentication bridge'
        },
        dependency: '@heyputer/puter.js ^2.2.2'
      }
    },
    vibeIntegration: {
      version: '8.0.0',
      description: 'Vibe AI Development Platform — free AI for code generation, analysis, testing, and deployment',
      download: '/downloads/vibe-8.0.0.zip',
      features: [
        '60+ CLI commands', '36 development tools', '4 free AI providers',
        'Story memory system', 'Code quality analyzer', 'Auto test generator',
        'Security scanner', 'Documentation generator', 'Code migrator'
      ]
    },
    timestamp: new Date().toISOString()
  });
};
