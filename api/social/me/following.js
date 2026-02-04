/**
 * GET /api/social/me/following?userId=
 * Returns list of user IDs the given user is following (from Postgres).
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
      'SELECT following_id FROM user_following WHERE follower_id = $1',
      [userId]
    );
    const following = result.rows.map((r) => r.following_id);
    res.status(200).json({ following });
  } catch (err) {
    console.warn('[api/social/me/following]', err?.message || err);
    res.status(200).json({ following: [] });
  }
};
