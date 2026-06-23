const { resolveWorkspace, workspaceChat } = require('../../_lib/anythingllm');
const { runFleetMismatchAudit } = require('../../_lib/fleet-mismatch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, workspace, task, mode, sessionId, includeMismatch } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    let preamble = '';
    if (includeMismatch || task === 'mismatch' || /mismatch|fleet audit|url drift/i.test(message)) {
      const audit = await runFleetMismatchAudit();
      preamble = `Fleet mismatch audit (${audit.issueCount} issues):\n${JSON.stringify(audit.issues, null, 2)}\n\nUser question: `;
    }

    const slug = workspace || resolveWorkspace(task);
    const result = await workspaceChat({
      workspace: slug,
      message: preamble + message,
      mode: mode || (task === 'mismatch' ? 'query' : 'chat'),
      sessionId
    });

    res.json({ workspace: slug, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};