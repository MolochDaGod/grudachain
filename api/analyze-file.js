const { callBestAvailableAI } = require('./_lib/ai-services');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      fallback: `Basic analysis for ${req.body?.filename}: File appears to be valid ${req.body?.type} code.`
    });
  }
};
