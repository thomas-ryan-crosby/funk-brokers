/** GET ?sellerId= | ?senderId=  POST create */
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
  return { id: r.id, propertyId: r.property_id, propertyAddress: r.property_address, sellerId: r.seller_id, senderId: r.sender_id, senderName: r.sender_name, reasonType: r.reason_type, note: r.note, status: r.status, createdAt: r.created_at };
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  if (req.method === 'GET') {
    const sellerId = (q.sellerId || '').trim();
    const senderId = (q.senderId || '').trim();
    if (sellerId) {
      const result = await query('SELECT * FROM pings WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 100', [sellerId]);
      return res.status(200).json({ pings: result.rows.map(mapRow) });
    }
    if (senderId) {
      const result = await query('SELECT * FROM pings WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 100', [senderId]);
      return res.status(200).json({ pings: result.rows.map(mapRow) });
    }
    return res.status(400).json({ error: 'Missing sellerId or senderId' });
  }
  if (req.method === 'POST') {
    const body = parseBody(req);
    const id = body.id || `ping_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await query(
      'INSERT INTO pings (id, property_id, property_address, seller_id, sender_id, sender_name, reason_type, note, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, body.propertyId, body.propertyAddress || null, body.sellerId, body.senderId, body.senderName || 'Anonymous', body.reasonType, body.note || null, body.status || 'new']
    );
    return res.status(201).json({ id });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
