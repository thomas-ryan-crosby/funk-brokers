/**
 * GET /api/favorites?userId= — list favorite property IDs for user
 * GET /api/favorites?userId=&propertyId= — check one favorite
 * GET /api/favorites/count?propertyId= — count favorites for property
 * POST /api/favorites — add (body: { userId, propertyId })
 * DELETE /api/favorites — remove (body: { userId, propertyId } or query params)
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

function genId() {
  return `fav_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const q = req.query || {};
  const userId = (q.userId || '').trim();
  const propertyId = (q.propertyId || '').trim();

  if (req.method === 'GET') {
    if (q.count !== undefined || (q.propertyId && !q.userId && !userId)) {
      const pid = (q.propertyId || propertyId).trim();
      if (!pid) return res.status(400).json({ error: 'Missing propertyId' });
      if (q.count !== undefined) {
        try {
          const result = await query('SELECT count(*)::int AS c FROM favorites WHERE property_id = $1', [pid]);
          return res.status(200).json({ count: result.rows[0]?.c ?? 0 });
        } catch (err) {
          console.warn('[api/favorites count]', err?.message || err);
          return res.status(200).json({ count: 0 });
        }
      }
      try {
        const result = await query(
          'SELECT id, user_id AS "userId", property_id AS "propertyId", created_at AS "createdAt" FROM favorites WHERE property_id = $1 ORDER BY created_at DESC LIMIT 50',
          [pid]
        );
        const favorites = result.rows;
        return res.status(200).json({ favorites });
      } catch (err) {
        console.warn('[api/favorites listByProperty]', err?.message || err);
        return res.status(200).json({ favorites: [] });
      }
    }
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
      if (propertyId) {
        const result = await query(
          'SELECT id, user_id AS "userId", property_id AS "propertyId", created_at AS "createdAt" FROM favorites WHERE user_id = $1 AND property_id = $2',
          [userId, propertyId]
        );
        const row = result.rows[0];
        if (!row) return res.status(200).json(null);
        return res.status(200).json({ id: row.id, userId: row.userId, propertyId: row.propertyId, createdAt: row.createdAt });
      }
      const result = await query(
        'SELECT property_id AS "propertyId" FROM favorites WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500',
        [userId]
      );
      const ids = result.rows.map((r) => r.propertyId);
      return res.status(200).json({ propertyIds: ids });
    } catch (err) {
      console.warn('[api/favorites list]', err?.message || err);
      return res.status(200).json({ propertyIds: [] });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const uid = body.userId || userId;
    const pid = body.propertyId || propertyId;
    if (!uid || !pid) return res.status(400).json({ error: 'Missing userId or propertyId' });
    try {
      const existing = await query('SELECT id FROM favorites WHERE user_id = $1 AND property_id = $2', [uid, pid]);
      if (existing.rows[0]) return res.status(201).json({ id: existing.rows[0].id });
      const id = body.id || genId();
      await query(
        'INSERT INTO favorites (id, user_id, property_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, property_id) DO NOTHING',
        [id, uid, pid]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/favorites add]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    let body = {};
    try {
      body = parseBody(req);
    } catch (_) {}
    const uid = body.userId || userId;
    const pid = body.propertyId || propertyId;
    if (!uid || !pid) return res.status(400).json({ error: 'Missing userId or propertyId' });
    try {
      await query('DELETE FROM favorites WHERE user_id = $1 AND property_id = $2', [uid, pid]);
      return res.status(200).json({ removed: true });
    } catch (err) {
      console.warn('[api/favorites delete]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
