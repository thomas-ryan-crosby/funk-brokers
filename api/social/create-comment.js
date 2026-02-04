/**
 * POST /api/social/create-comment — dual-write comment to Postgres (Wave 4).
 * Body: { postId, id, authorId, authorName, body, createdAt }
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const postId = body.postId;
  const commentId = body.id;
  const authorId = body.authorId;
  if (!postId || !commentId || !authorId) {
    return res.status(400).json({ error: 'Missing postId, id, or authorId' });
  }

  const created = parseDate(body.createdAt) || new Date();

  try {
    await query(
      'INSERT INTO users (id, name, public_username, created_at, updated_at) VALUES ($1, $2, $2, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), updated_at = NOW()',
      [authorId, body.authorName || 'User']
    );
    await query(
      'INSERT INTO comments (id, post_id, author_id, author_name, body, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [commentId, postId, authorId, body.authorName || null, body.body ?? '', created]
    );
    await query('UPDATE posts SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = $1', [postId]);
    res.status(204).end();
  } catch (err) {
    console.warn('[api/social/create-comment]', err?.message || err);
    res.status(204).end();
  }
};
