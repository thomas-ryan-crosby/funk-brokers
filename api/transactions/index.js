/**
 * GET /api/transactions?userId= | ?offerId= | ?id=
 * POST /api/transactions — create
 * PATCH /api/transactions — update steps or assignedVendors
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

function parseDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'string') return JSON.parse(v);
  return [];
}
function ensureObject(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (v && typeof v === 'string') return JSON.parse(v);
  return {};
}

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    offerId: r.offer_id,
    propertyId: r.property_id,
    offerType: r.offer_type,
    buyerId: r.buyer_id,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerPhone: r.buyer_phone,
    sellerId: r.seller_id,
    parties: ensureArray(r.parties),
    offerAmount: r.offer_amount != null ? Number(r.offer_amount) : null,
    earnestMoney: r.earnest_money != null ? Number(r.earnest_money) : null,
    proposedClosingDate: r.proposed_closing_date,
    financingType: r.financing_type,
    contingencies: ensureObject(r.contingencies),
    acceptedAt: r.accepted_at,
    status: r.status,
    steps: ensureArray(r.steps),
    disclosureAcknowledgedAt: r.disclosure_acknowledged_at,
    disclosureAcknowledgedByName: r.disclosure_acknowledged_by_name,
    assignedVendors: ensureArray(r.assigned_vendors),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const CAP = 100;

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
        const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'Transaction not found' });
        return res.status(200).json(mapRow(row));
      } catch (err) {
        console.warn('[api/transactions get id]', err?.message || err);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    const offerId = (q.offerId || '').trim();
    if (offerId) {
      try {
        const result = await query('SELECT * FROM transactions WHERE offer_id = $1 LIMIT 1', [offerId]);
        const row = result.rows[0];
        if (!row) return res.status(200).json(null);
        return res.status(200).json(mapRow(row));
      } catch (err) {
        console.warn('[api/transactions get by offerId]', err?.message || err);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    const userId = (q.userId || '').trim();
    if (userId) {
      try {
        const result = await query(
          `SELECT t.* FROM transactions t
           LEFT JOIN offers o ON o.id = t.offer_id
           WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(t.parties) AS el WHERE el = $1)
           AND COALESCE(t.offer_type, o.offer_type, 'psa') != 'loi'
           ORDER BY t.accepted_at DESC
           LIMIT $2`,
          [userId, CAP]
        );
        const list = result.rows.map((r) => mapRow(r)).filter(Boolean);
        return res.status(200).json({ transactions: list });
      } catch (err) {
        console.warn('[api/transactions get by user]', err?.message || err);
        return res.status(200).json({ transactions: [] });
      }
    }
    return res.status(400).json({ error: 'Missing id, offerId, or userId' });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const id = body.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const acceptedAt = parseDate(body.acceptedAt) || new Date();
    const createdAt = parseDate(body.createdAt) || acceptedAt;
    const updatedAt = parseDate(body.updatedAt) || acceptedAt;
    const parties = Array.isArray(body.parties) ? body.parties : [];
    const steps = Array.isArray(body.steps) ? body.steps : [];
    const assignedVendors = Array.isArray(body.assignedVendors) ? body.assignedVendors : [];
    try {
      await query(
        `INSERT INTO transactions (
          id, offer_id, property_id, offer_type, buyer_id, buyer_name, buyer_email, buyer_phone,
          seller_id, parties, offer_amount, earnest_money, proposed_closing_date, financing_type,
          contingencies, accepted_at, status, steps, disclosure_acknowledged_at, disclosure_acknowledged_by_name,
          assigned_vendors, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [
          id,
          body.offerId ?? null,
          body.propertyId ?? null,
          body.offerType ?? null,
          body.buyerId ?? null,
          body.buyerName ?? null,
          body.buyerEmail ?? null,
          body.buyerPhone ?? null,
          body.sellerId ?? null,
          JSON.stringify(parties),
          body.offerAmount ?? null,
          body.earnestMoney ?? null,
          body.proposedClosingDate ? parseDate(body.proposedClosingDate) : null,
          body.financingType ?? null,
          body.contingencies ? JSON.stringify(body.contingencies) : '{}',
          acceptedAt,
          body.status || 'active',
          JSON.stringify(steps),
          body.disclosureAcknowledgedAt ? parseDate(body.disclosureAcknowledgedAt) : null,
          body.disclosureAcknowledgedByName ?? null,
          JSON.stringify(assignedVendors),
          createdAt,
          updatedAt,
        ]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/transactions create]', err?.message || err);
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

    if (body.steps !== undefined) {
      try {
        const steps = Array.isArray(body.steps) ? body.steps : [];
        await query(
          'UPDATE transactions SET steps = $1, updated_at = now() WHERE id = $2',
          [JSON.stringify(steps), id]
        );
        return res.status(200).json({ id });
      } catch (err) {
        console.warn('[api/transactions patch steps]', err?.message || err);
        return res.status(500).json({ error: err?.message || 'Server error' });
      }
    }
    if (body.assignedVendors !== undefined) {
      try {
        const assignedVendors = Array.isArray(body.assignedVendors) ? body.assignedVendors : [];
        await query(
          'UPDATE transactions SET assigned_vendors = $1, updated_at = now() WHERE id = $2',
          [JSON.stringify(assignedVendors), id]
        );
        return res.status(200).json({ id });
      } catch (err) {
        console.warn('[api/transactions patch assignedVendors]', err?.message || err);
        return res.status(500).json({ error: err?.message || 'Server error' });
      }
    }
    return res.status(200).json({ id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
