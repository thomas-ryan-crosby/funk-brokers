/**
 * GET /api/social/posts/by-author?authorId=&limit=&before=
 * Reads posts by author from Postgres.
 */

const { query } = require('../../_db');
const { mapRowToPost, parseLimit } = require('../_utils');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorId = req.query.authorId;
  if (!authorId) {
    return res.status(400).json({ error: 'Missing authorId' });
  }
  const limit = parseLimit(req.query.limit, 100, 200);
  const before = req.query.before ? new Date(req.query.before) : null;

  try {
    const params = [authorId];
    let where = '';
    if (before && !Number.isNaN(before.getTime())) {
      params.push(before);
      where = `AND created_at < $${params.length}`;
    }
    params.push(limit);
    const sql = `
      SELECT *
      FROM posts
      WHERE author_id = $1
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;
    const result = await query(sql, params);
    const posts = result.rows.map(mapRowToPost).filter(Boolean);
    res.status(200).json({ posts });
  } catch (err) {
    if (String(err?.message || '').includes('DATABASE_URL')) {
      return res.status(501).json({ error: 'Database not configured' });
    }
    console.error('[api/social/posts/by-author]', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
};
