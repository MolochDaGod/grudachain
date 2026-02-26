module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.json({
    success: true,
    service: 'Puter Cloud Storage',
    description: 'GrudaChain uses Puter.js for free, unlimited cloud object storage. All operations run client-side — no server-side storage costs.',
    endpoints: {
      dashboard: '/index.html',
      storageConfig: '/api/storage/list',
      health: '/api/health',
      status: '/api/status'
    },
    puterAPIs: {
      'puter.fs.write': 'Upload files to cloud storage',
      'puter.fs.read': 'Download files from cloud storage',
      'puter.fs.readdir': 'List directory contents',
      'puter.fs.mkdir': 'Create directories (buckets)',
      'puter.fs.delete': 'Delete files and directories',
      'puter.fs.copy': 'Copy files',
      'puter.fs.move': 'Move/rename files',
      'puter.kv.set': 'Store key-value data',
      'puter.kv.get': 'Retrieve key-value data',
      'puter.kv.del': 'Delete key-value entries',
      'puter.kv.list': 'List all key-value entries',
      'puter.hosting.create': 'Deploy to *.puter.site',
      'puter.auth.signIn': 'Authenticate with Puter',
      'puter.ai.chat': 'Free AI chat (Claude, GPT-4o, Gemini)'
    },
    timestamp: new Date().toISOString()
  });
};
