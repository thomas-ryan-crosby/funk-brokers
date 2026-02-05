/**
 * GET /api/social/feed/by-property?propertyId=&address=
 * Returns posts linked to the given property (by property_id or by property_address match).
 * Used for Community Posts on the property detail page.
 */

const { query } = require('../../_db');
const { mapRowToPost, parseLimit } = require('../_utils');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const propertyId = (req.query.propertyId || '').trim() || null;
  const address = (req.query.address || '').trim() || null;

  if (!propertyId && !address) {
    return res.status(200).json({ posts: [] });
  }

  const limit = parseLimit(req.query.limit, 50, 100);

  try {
    const params = [];
    const conditions = [];

    if (propertyId) {
      params.push(propertyId);
      conditions.push(`property_id = $${params.length}`);
    }
    if (address) {
      const escaped = address.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      params.push(`%${escaped}%`);
      conditions.push(`property_address ILIKE $${params.length}`);
      // Also match by street + city so "15 X, Mandeville, LA, 70471" matches "15 X, Mandeville, Louisiana 70471, United States"
      const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const prefix = parts.slice(0, 2).join(', ');
        const prefixEscaped = prefix.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        params.push(`${prefixEscaped}%`);
        conditions.push(`property_address ILIKE $${params.length}`);
      }
    }

    const where = conditions.length ? `WHERE (${conditions.join(' OR ')})` : '';
    params.push(limit);

    const sql = `
      SELECT *
      FROM posts
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;
    const result = await query(sql, params);
    const posts = result.rows.map(mapRowToPost).filter(Boolean);
    res.status(200).json({ posts });
  } catch (err) {
    console.warn('[api/social/feed/by-property]', err?.message || err);
    res.status(200).json({ posts: [] });
  }
};
