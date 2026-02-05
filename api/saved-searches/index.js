/**
 * GET /api/saved-searches?userId=
 * POST /api/saved-searches — body: { userId, name, filters }
 * DELETE /api/saved-searches — body: { id }
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

const CAP = 50;

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const q = req.query || {};

  if (req.method === 'GET') {
    const userId = (q.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
      const result = await query(
        'SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, CAP]
      );
      const list = result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        filters: r.filters && typeof r.filters === 'object' ? r.filters : (r.filters ? JSON.parse(r.filters) : {}),
        createdAt: r.created_at,
      }));
      return res.status(200).json({ savedSearches: list });
    } catch (err) {
      console.warn('[api/saved-searches get]', err?.message || err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const userId = (body.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const id = body.id || `ss_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const name = body.name || 'My search';
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
    try {
      await query(
        'INSERT INTO saved_searches (id, user_id, name, filters, created_at) VALUES ($1, $2, $3, $4::jsonb, now())',
        [id, userId, name, JSON.stringify(filters)]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/saved-searches post]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = (body.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await query('DELETE FROM saved_searches WHERE id = $1', [id]);
      return res.status(200).json({ id });
    } catch (err) {
      console.warn('[api/saved-searches delete]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
