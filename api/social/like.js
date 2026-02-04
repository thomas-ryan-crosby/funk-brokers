/**
 * POST /api/social/like — like a post (dual-write to Postgres).
 * DELETE /api/social/like — unlike a post.
 * Body: { postId, userId }
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { postId, userId } = body;
  if (!postId || !userId) {
    return res.status(400).json({ error: 'Missing postId or userId' });
  }

  try {
    if (req.method === 'POST') {
      await query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId]
      );
      await query(
        `UPDATE posts SET like_count = like_count + 1, updated_at = NOW() WHERE id = $1`,
        [postId]
      );
    } else {
      await query(
        `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      await query(
        `UPDATE posts SET like_count = GREATEST(0, like_count - 1), updated_at = NOW() WHERE id = $1`,
        [postId]
      );
    }
    res.status(204).end();
  } catch (err) {
    console.warn('[api/social/like]', err?.message || err);
    res.status(204).end();
  }
};
