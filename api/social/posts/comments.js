/**
 * GET /api/social/posts/comments?postId=
 * Returns comments for a post (from Postgres).
 */

const { query } = require('../../_db');
const { mapRowToComment } = require('../_utils');

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
  const postId = req.query.postId;
  if (!postId) {
    return res.status(400).json({ error: 'Missing postId' });
  }
  try {
    const result = await query(
      'SELECT id, post_id, author_id, author_name, body, created_at FROM comments WHERE post_id = $1 ORDER BY created_at ASC LIMIT 500',
      [postId]
    );
    const comments = result.rows.map(mapRowToComment).filter(Boolean);
    res.status(200).json({ comments });
  } catch (err) {
    console.warn('[api/social/posts/comments]', err?.message || err);
    res.status(200).json({ comments: [] });
  }
};
