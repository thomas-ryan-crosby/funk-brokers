/** GET ?userId= | ?id=  POST create  PATCH update  DELETE */
const { query } = require('../_db');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}
function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'string') return JSON.parse(v);
  return [];
}
function mapRow(r) {
  if (!r) return null;
  return { id: r.id, userId: r.user_id, vendorName: r.vendor_name, type: r.type, customType: r.custom_type, website: r.website, phone: r.phone, email: r.email, address: r.address, notes: r.notes, contacts: ensureArray(r.contacts), createdAt: r.created_at, updatedAt: r.updated_at };
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  if (req.method === 'GET') {
    const id = (q.id || '').trim();
    if (id) {
      const result = await query('SELECT * FROM vendors WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(mapRow(row));
    }
    const userId = (q.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'Missing userId or id' });
    const result = await query('SELECT * FROM vendors WHERE user_id = $1 ORDER BY vendor_name LIMIT 100', [userId]);
    return res.status(200).json({ vendors: result.rows.map(mapRow) });
  }
  if (req.method === 'POST') {
    const body = parseBody(req);
    const id = body.id || `ven_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await query(
      `INSERT INTO vendors (id, user_id, vendor_name, type, custom_type, website, phone, email, address, notes, contacts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [id, body.userId, body.vendorName || '', body.type || 'other', body.type === 'other' ? (body.customType || null) : null, body.website || null, body.phone || null, body.email || null, body.address || null, body.notes || null, JSON.stringify(body.contacts || [])]
    );
    return res.status(201).json({ id });
  }
  if (req.method === 'PATCH') {
    const body = parseBody(req);
    const id = body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const updates = [];
    const vals = [];
    let i = 1;
    ['vendorName', 'type', 'customType', 'website', 'phone', 'email', 'address', 'notes', 'contacts'].forEach((k) => {
      if (body[k] !== undefined) {
        const col = k === 'vendorName' ? 'vendor_name' : k === 'customType' ? 'custom_type' : k;
        if (k === 'contacts') { updates.push(`${col} = $${i}::jsonb`); vals.push(JSON.stringify(body[k])); }
        else { updates.push(`${col} = $${i}`); vals.push(body[k]); }
        i++;
      }
    });
    if (updates.length === 0) return res.status(200).json({ id });
    vals.push(id);
    await query(`UPDATE vendors SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i}`, vals);
    return res.status(200).json({ id });
  }
  if (req.method === 'DELETE') {
    const body = parseBody(req);
    const id = (body.id || q.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await query('DELETE FROM vendors WHERE id = $1', [id]);
    return res.status(200).json({ id });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
