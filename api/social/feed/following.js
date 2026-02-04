/**
 * GET /api/social/feed/following?userId=&limit=&before=
 * Reads posts from Postgres for authors the user follows.
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

  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  const limit = parseLimit(req.query.limit, 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  try {
    const params = [userId];
    let where = '';
    if (before && !Number.isNaN(before.getTime())) {
      params.push(before);
      where = `AND p.created_at < $${params.length}`;
    }
    params.push(limit);
    const sql = `
      SELECT p.*
      FROM posts p
      JOIN user_following f
        ON f.following_id = p.author_id
      WHERE f.follower_id = $1
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${params.length}
    `;
    const result = await query(sql, params);
    const posts = result.rows.map(mapRowToPost).filter(Boolean);
    res.status(200).json({ posts });
  } catch (err) {
    console.warn('[api/social/feed/following]', err?.message || err);
    res.status(200).json({ posts: [] });
  }
};
