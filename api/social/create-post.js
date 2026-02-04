/**
 * POST /api/social/create-post — dual-write post to Postgres (Wave 4).
 * Body: { id, authorId, authorName, type, body, propertyId?, propertyAddress?, imageUrl?, pollOptions?, hashtags?, userTags?, likeCount, commentCount, createdAt, updatedAt }
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

  const id = body.id;
  const authorId = body.authorId;
  if (!id || !authorId) {
    return res.status(400).json({ error: 'Missing id or authorId' });
  }

  const created = parseDate(body.createdAt) || new Date();
  const updated = parseDate(body.updatedAt) || new Date();
  const pollOptions = Array.isArray(body.pollOptions) ? body.pollOptions : [];
  const hashtags = Array.isArray(body.hashtags) ? body.hashtags : [];
  const userTags = Array.isArray(body.userTags) ? body.userTags : [];
  const likeCount = Number.isFinite(Number(body.likeCount)) ? Number(body.likeCount) : 0;
  const commentCount = Number.isFinite(Number(body.commentCount)) ? Number(body.commentCount) : 0;

  try {
    await query(
      'INSERT INTO users (id, name, public_username, created_at, updated_at) VALUES ($1, $2, $2, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), updated_at = NOW()',
      [authorId, body.authorName || 'User']
    );
    await query(
      `INSERT INTO posts (id, author_id, author_name, type, body, property_id, property_address, image_url, poll_options, hashtags, user_tags, like_count, comment_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, image_url = EXCLUDED.image_url, updated_at = EXCLUDED.updated_at`,
      [
        id,
        authorId,
        body.authorName || null,
        body.type || 'tweet',
        body.body ?? '',
        body.propertyId ?? null,
        body.propertyAddress ?? null,
        body.imageUrl ?? null,
        JSON.stringify(pollOptions),
        hashtags,
        userTags,
        likeCount,
        commentCount,
        created,
        updated,
      ]
    );
    res.status(201).json({ id });
  } catch (err) {
    console.warn('[api/social/create-post]', err?.message || err);
    res.status(201).json({ id: id || null });
  }
};
