/**
 * GET /api/messages?userId= — list messages for user (sent + received)
 * POST /api/messages — create
 */

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

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    recipientId: r.recipient_id,
    recipientName: r.recipient_name,
    propertyId: r.property_id,
    propertyAddress: r.property_address,
    body: r.body,
    read: r.read === true,
    createdAt: r.created_at,
  };
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const userId = (req.query && req.query.userId) ? req.query.userId.trim() : null;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
      const result = await query(
        `SELECT * FROM (
           (SELECT * FROM messages WHERE recipient_id = $1)
           UNION ALL
           (SELECT * FROM messages WHERE sender_id = $1)
         ) t ORDER BY created_at DESC LIMIT 400`,
        [userId]
      );
      const byId = new Map();
      result.rows.forEach((r) => {
        if (!byId.has(r.id)) byId.set(r.id, mapRow(r));
      });
      const list = Array.from(byId.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.status(200).json({ messages: list.slice(0, 400) });
    } catch (err) {
      console.warn('[api/messages list]', err?.message || err);
      return res.status(200).json({ messages: [] });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id || genId();
    if (!body.senderId || !body.recipientId) return res.status(400).json({ error: 'Missing senderId or recipientId' });
    try {
      await query(
        `INSERT INTO messages (id, sender_id, sender_name, recipient_id, recipient_name, property_id, property_address, body, read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
        [
          id,
          body.senderId,
          body.senderName ?? null,
          body.recipientId,
          body.recipientName ?? null,
          body.propertyId ?? null,
          body.propertyAddress ?? null,
          String(body.body || '').trim(),
        ]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/messages create]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
