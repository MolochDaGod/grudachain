const { callBestAvailableAI, generateCodeFallback } = require('./_lib/ai-services');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      fallback: generateCodeFallback(req.body?.description, req.body?.language)
    });
  }
};
