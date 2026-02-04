/**
 * DELETE /api/social/delete-post — delete post from Postgres (body: { id }).
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  const method = req.method;
  if (method !== 'DELETE' && method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const id = body.id;
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }
  try {
    await query('DELETE FROM posts WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.warn('[api/social/delete-post]', err?.message || err);
    res.status(204).end();
  }
};
