/**
 * POST /api/social/follow — follow a user (dual-write to Postgres).
 * DELETE /api/social/follow — unfollow a user.
 * Body: { followerId, followingId }
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

  const { followerId, followingId } = body;
  if (!followerId || !followingId || followerId === followingId) {
    return res.status(400).json({ error: 'Missing or invalid followerId/followingId' });
  }

  try {
    if (req.method === 'POST') {
      await query(
        `INSERT INTO user_following (follower_id, following_id) VALUES ($1, $2) ON CONFLICT (follower_id, following_id) DO NOTHING`,
        [followerId, followingId]
      );
    } else {
      await query(
        `DELETE FROM user_following WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );
    }
    res.status(204).end();
  } catch (err) {
    console.warn('[api/social/follow]', err?.message || err);
    res.status(204).end();
  }
};
