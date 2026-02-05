/** GET ?buyerId= | ?id=  POST create  PATCH update  DELETE */
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
function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    buyerId: r.buyer_id,
    agreement: r.agreement,
    sourceLoiOfferId: r.source_loi_offer_id,
    sourceLoi: r.source_loi,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  if (req.method === 'GET') {
    const id = (q.id || '').trim();
    if (id) {
      const result = await query('SELECT * FROM psa_drafts WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(mapRow(row));
    }
    const buyerId = (q.buyerId || '').trim();
    if (!buyerId) return res.status(400).json({ error: 'Missing buyerId or id' });
    const result = await query('SELECT * FROM psa_drafts WHERE buyer_id = $1 ORDER BY updated_at DESC LIMIT 50', [buyerId]);
    const list = result.rows.map(mapRow);
    return res.status(200).json({ drafts: list });
  }
  if (req.method === 'POST') {
    const body = parseBody(req);
    const id = body.id || `psa_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await query(
      `INSERT INTO psa_drafts (id, property_id, buyer_id, agreement, source_loi_offer_id, source_loi, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, now())`,
      [id, body.propertyId, body.buyerId, JSON.stringify(body.agreement || {}), body.sourceLoiOfferId || null, JSON.stringify(body.sourceLoi || {})]
    );
    return res.status(201).json({ id });
  }
  if (req.method === 'PATCH') {
    const body = parseBody(req);
    const id = body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await query(
      `UPDATE psa_drafts SET property_id = COALESCE($2, property_id), buyer_id = COALESCE($3, buyer_id), agreement = COALESCE($4::jsonb, agreement),
       source_loi_offer_id = COALESCE($5, source_loi_offer_id), source_loi = COALESCE($6::jsonb, source_loi), updated_at = now() WHERE id = $1`,
      [id, body.propertyId, body.buyerId, body.agreement != null ? JSON.stringify(body.agreement) : null, body.sourceLoiOfferId, body.sourceLoi != null ? JSON.stringify(body.sourceLoi) : null]
    );
    return res.status(200).json({ id });
  }
  if (req.method === 'DELETE') {
    const body = parseBody(req);
    const id = (body.id || q.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await query('DELETE FROM psa_drafts WHERE id = $1', [id]);
    return res.status(200).json({ id });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
