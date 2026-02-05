/**
 * GET /api/listing-progress?propertyId=
 * PUT /api/listing-progress — upsert (body: { propertyId, step?, formData?, completedSteps? })
 * DELETE /api/listing-progress — body: { propertyId }
 */

const { query } = require('../_db');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function mapRow(r) {
  if (!r) return null;
  const formData = r.form_data && typeof r.form_data === 'object' ? r.form_data : (r.form_data ? JSON.parse(r.form_data) : {});
  const completedSteps = r.completed_steps && Array.isArray(r.completed_steps) ? r.completed_steps : (r.completed_steps ? JSON.parse(r.completed_steps) : []);
  return {
    id: r.property_id,
    propertyId: r.property_id,
    step: r.step,
    formData: formData,
    completedSteps: completedSteps,
    updatedAt: r.updated_at,
  };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const q = req.query || {};

  if (req.method === 'GET') {
    const propertyId = (q.propertyId || '').trim();
    if (!propertyId) return res.status(400).json({ error: 'Missing propertyId' });
    try {
      const result = await query('SELECT * FROM listing_progress WHERE property_id = $1', [propertyId]);
      const row = result.rows[0];
      if (!row) return res.status(200).json(null);
      return res.status(200).json(mapRow(row));
    } catch (err) {
      console.warn('[api/listing-progress get]', err?.message || err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const propertyId = (body.propertyId || body.property_id || '').trim();
    if (!propertyId) return res.status(400).json({ error: 'Missing propertyId' });
    const step = body.step ?? null;
    const formData = body.formData ?? body.form_data ?? {};
    const completedSteps = Array.isArray(body.completedSteps) ? body.completedSteps : (Array.isArray(body.completed_steps) ? body.completed_steps : []);
    try {
      await query(
        `INSERT INTO listing_progress (property_id, step, form_data, completed_steps, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, now())
         ON CONFLICT (property_id) DO UPDATE SET
           step = COALESCE(EXCLUDED.step, listing_progress.step),
           form_data = listing_progress.form_data || EXCLUDED.form_data,
           completed_steps = CASE WHEN EXCLUDED.completed_steps != '[]'::jsonb THEN EXCLUDED.completed_steps ELSE listing_progress.completed_steps END,
           updated_at = now()`,
        [propertyId, step, JSON.stringify(formData), JSON.stringify(completedSteps)]
      );
      return res.status(200).json({ propertyId });
    } catch (err) {
      console.warn('[api/listing-progress put]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const propertyId = (body.propertyId || body.property_id || '').trim();
    if (!propertyId) return res.status(400).json({ error: 'Missing propertyId' });
    try {
      await query('DELETE FROM listing_progress WHERE property_id = $1', [propertyId]);
      return res.status(200).json({ propertyId });
    } catch (err) {
      console.warn('[api/listing-progress delete]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
