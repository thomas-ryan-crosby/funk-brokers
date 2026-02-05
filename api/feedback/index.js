/** GET ?limit=  POST create */
const { query } = require('../_db');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  if (req.method === 'GET') {
    const limit = Math.min(parseInt(q.limit, 10) || 100, 200);
    const result = await query('SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1', [limit]);
    const list = result.rows.map((r) => ({ id: r.id, userId: r.user_id, authorName: r.author_name, body: r.body, type: r.type, section: r.section, createdAt: r.created_at }));
    return res.status(200).json({ feedback: list });
  }
  if (req.method === 'POST') {
    const body = parseBody(req);
    const id = body.id || `fb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await query(
      'INSERT INTO feedback (id, user_id, author_name, body, type, section) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, body.userId || null, body.authorName || null, (body.body || '').trim(), body.type || 'feedback', (body.section || '').trim() || null]
    );
    return res.status(201).json({ id });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
