/**
 * GET /api/social/feed/for-you?limit=&before=
 * Reads from Postgres (Wave 4) when DATABASE_URL is configured.
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

  const limit = parseLimit(req.query.limit, 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  try {
    const params = [];
    let where = '';
    if (before && !Number.isNaN(before.getTime())) {
      params.push(before);
      where = `WHERE created_at < $${params.length}`;
    }
    params.push(limit);
    const sql = `
      SELECT *
      FROM posts
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;
    const result = await query(sql, params);
    const posts = result.rows.map(mapRowToPost).filter(Boolean);
    res.status(200).json({ posts });
  } catch (err) {
    console.warn('[api/social/feed/for-you]', err?.message || err);
    res.status(200).json({ posts: [] });
  }
};
