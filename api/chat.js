const { callBestAvailableAI, generateLocalResponse } = require('./_lib/ai-services');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, model = 'auto', temperature = 0.7 } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response = null;
    let usedService = null;

    try {
      response = await callBestAvailableAI(message, model);
      usedService = 'puter';
    } catch (error) {
      console.warn('AI service failed:', error.message);
    }

    if (!response) {
      response = generateLocalResponse(message);
      usedService = 'local';
    }

    res.json({
      success: true,
      response,
      service: usedService,
      model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      fallback: generateLocalResponse(req.body?.message || 'Hello'),
      timestamp: new Date().toISOString()
    });
  }
};
