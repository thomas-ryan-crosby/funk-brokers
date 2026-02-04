/**
 * GET /api/social/me/liked-post-ids?userId=
 * Returns post IDs the user has liked (from Postgres).
 */

const { query } = require('../../_db');

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
  try {
    const result = await query(
      'SELECT post_id FROM post_likes WHERE user_id = $1',
      [userId]
    );
    const postIds = result.rows.map((r) => r.post_id);
    res.status(200).json({ postIds });
  } catch (err) {
    console.warn('[api/social/me/liked-post-ids]', err?.message || err);
    res.status(200).json({ postIds: [] });
  }
};
