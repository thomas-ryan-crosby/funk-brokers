/**
 * GET /api/offers?propertyId= | ?buyerId= | ?id=
 * POST /api/offers — create
 * PATCH /api/offers — update status (body: { id, status, ... })
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function mapRow(r) {
  if (!r) return null;
  const o = {
    id: r.id,
    propertyId: r.property_id,
    buyerId: r.buyer_id,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerPhone: r.buyer_phone,
    offerAmount: r.offer_amount != null ? Number(r.offer_amount) : null,
    status: r.status,
    offerType: r.offer_type,
    message: r.message,
    counterToOfferId: r.counter_to_offer_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    earnestMoney: r.earnest_money != null ? Number(r.earnest_money) : null,
    proposedClosingDate: r.proposed_closing_date,
    financingType: r.financing_type,
    downPayment: r.down_payment != null ? Number(r.down_payment) : null,
    sellerConcessions: r.seller_concessions,
    contingencies: r.contingencies,
    inclusions: r.inclusions,
    possession: r.possession,
    verificationDocuments: r.verification_documents,
    loi: r.loi,
    counteredByOfferId: r.countered_by_offer_id,
  };
  return o;
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

  const q = req.query || {};

  if (req.method === 'GET') {
    const id = (q.id || '').trim();
    if (id) {
      try {
        const result = await query('SELECT * FROM offers WHERE id = $1', [id]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'Offer not found' });
        return res.status(200).json(mapRow(row));
      } catch (err) {
        console.warn('[api/offers get]', err?.message || err);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    const propertyId = (q.propertyId || '').trim();
    const buyerId = (q.buyerId || '').trim();
    if (!propertyId && !buyerId) return res.status(400).json({ error: 'Missing propertyId or buyerId' });
    try {
      const sql = propertyId
        ? 'SELECT * FROM offers WHERE property_id = $1 ORDER BY created_at DESC LIMIT 100'
        : 'SELECT * FROM offers WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 100';
      const result = await query(sql, [propertyId || buyerId]);
      const offers = result.rows.map(mapRow).filter(Boolean);
      return res.status(200).json({ offers });
    } catch (err) {
      console.warn('[api/offers list]', err?.message || err);
      return res.status(200).json({ offers: [] });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id || `off_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const created = parseDate(body.createdAt) || new Date();
    const updated = parseDate(body.updatedAt) || new Date();
    try {
      await query(
        `INSERT INTO offers (
          id, property_id, buyer_id, buyer_name, buyer_email, buyer_phone, offer_amount, status, offer_type, message,
          counter_to_offer_id, created_by, created_at, updated_at,
          earnest_money, proposed_closing_date, financing_type, down_payment, seller_concessions, contingencies,
          inclusions, possession, earnest_money_form, earnest_money_deposited_with, earnest_money_due,
          offer_expiration_date, offer_expiration_time, verification_documents, loi, countered_by_offer_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
        [
          id,
          body.propertyId ?? null,
          body.buyerId ?? null,
          body.buyerName ?? null,
          body.buyerEmail ?? null,
          body.buyerPhone ?? null,
          body.offerAmount ?? null,
          body.status || 'pending',
          body.offerType ?? null,
          body.message ?? null,
          body.counterToOfferId ?? null,
          body.createdBy ?? null,
          created,
          updated,
          body.earnestMoney ?? null,
          body.proposedClosingDate ? parseDate(body.proposedClosingDate) : null,
          body.financingType ?? null,
          body.downPayment ?? null,
          body.sellerConcessions ? JSON.stringify(body.sellerConcessions) : null,
          body.contingencies ? JSON.stringify(body.contingencies) : null,
          body.inclusions ?? null,
          body.possession ?? null,
          body.earnestMoneyForm ?? null,
          body.earnestMoneyDepositedWith ?? null,
          body.earnestMoneyDue ?? null,
          body.offerExpirationDate ?? null,
          body.offerExpirationTime ?? null,
          body.verificationDocuments ? JSON.stringify(body.verificationDocuments) : null,
          body.loi ? JSON.stringify(body.loi) : null,
          body.counteredByOfferId ?? null,
        ]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/offers create]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const updates = [];
    const params = [];
    let idx = 0;
    if (body.status !== undefined) {
      idx++;
      updates.push(`status = $${idx}`);
      params.push(body.status);
    }
    if (body.counteredByOfferId !== undefined) {
      idx++;
      updates.push(`countered_by_offer_id = $${idx}`);
      params.push(body.counteredByOfferId);
    }
    if (body.earnestMoney !== undefined) {
      idx++;
      updates.push(`earnest_money = $${idx}`);
      params.push(body.earnestMoney);
    }
    if (body.proposedClosingDate !== undefined) {
      idx++;
      updates.push(`proposed_closing_date = $${idx}`);
      params.push(parseDate(body.proposedClosingDate));
    }
    if (updates.length === 0) return res.status(200).json({ id });
    idx++;
    params.push(id);
    try {
      await query(`UPDATE offers SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx}`, params);
      return res.status(200).json({ id });
    } catch (err) {
      console.warn('[api/offers patch]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
