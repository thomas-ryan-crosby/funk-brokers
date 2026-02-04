/**
 * GET /api/social/users/followers?userId=
 * Returns list of follower user IDs for the given user (from Postgres).
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
      'SELECT follower_id FROM user_following WHERE following_id = $1 LIMIT 500',
      [userId]
    );
    const followers = result.rows.map((r) => r.follower_id);
    res.status(200).json({ followers });
  } catch (err) {
    console.warn('[api/social/users/followers]', err?.message || err);
    res.status(200).json({ followers: [] });
  }
};
