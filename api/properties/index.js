/**
 * GET /api/properties — list (query: limit, sellerId, listedStatus, ...)
 * GET /api/properties?id=xxx — single property
 * POST /api/properties — create (body: { id?, ...propertyData }) or claim (body: { action: 'claim', sellerId, parcel })
 */

const { query } = require('../_db');
const { mapRowToProperty, parseDate, parseLimit } = require('./_utils');

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

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const id = (req.query && req.query.id) ? req.query.id.trim() : null;
    if (id) {
      try {
        const result = await query('SELECT * FROM properties WHERE id = $1', [id]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: 'Property not found' });
        return res.status(200).json(mapRowToProperty(row));
      } catch (err) {
        console.warn('[api/properties get one]', err?.message || err);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    const limit = parseLimit(req.query && req.query.limit, 75, 200);
    const sellerId = (req.query && req.query.sellerId) ? req.query.sellerId.trim() : null;
    const includeArchived = (req.query && req.query.includeArchived) === 'true' || (req.query && req.query.includeArchived) === true;

    try {
      let sql = 'SELECT * FROM properties';
      const params = [];
      const conditions = [];
      let paramIdx = 0;
      if (!includeArchived) conditions.push('archived = false');
      if (sellerId) {
        paramIdx++;
        params.push(sellerId);
        conditions.push(`seller_id = $${paramIdx}`);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      paramIdx++;
      params.push(limit);
      sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
      const result = await query(sql, params);
      const list = result.rows.map(mapRowToProperty).filter(Boolean);

      const listedStatus = (req.query && req.query.listedStatus) ? req.query.listedStatus : null;
      let filtered = list;
      if (listedStatus === 'listed') {
        filtered = list.filter((p) => p.availableForSale !== false && (p.status === 'active' || p.status === 'under_contract'));
      } else if (listedStatus === 'not_listed') {
        filtered = list.filter((p) => p.availableForSale === false || p.status === 'not_listed' || (p.status !== 'active' && p.status !== 'under_contract'));
      }

      return res.status(200).json({ properties: filtered });
    } catch (err) {
      console.warn('[api/properties list]', err?.message || err);
      return res.status(200).json({ properties: [] });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = parseBody(req);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (body.action === 'claim') {
      const sellerId = body.sellerId;
      const parcel = body.parcel || {};
      if (!sellerId) return res.status(400).json({ error: 'Missing sellerId' });
      const id = body.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date();
      try {
        await query(
          `INSERT INTO properties (
            id, seller_id, address, city, state, zip_code, latitude, longitude, attom_id,
            property_type, bedrooms, bathrooms, square_feet, price, funk_estimate, photos, features,
            status, available_for_sale, accepting_offers, accepting_communications, archived, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
          [
            id,
            sellerId,
            parcel.address || 'Address unknown',
            parcel.city ?? '',
            parcel.state ?? '',
            parcel.zipCode ?? '',
            parcel.latitude ?? null,
            parcel.longitude ?? null,
            parcel.attomId ?? null,
            parcel.propertyType ?? '',
            parcel.beds != null && Number.isFinite(Number(parcel.beds)) ? Number(parcel.beds) : null,
            parcel.baths != null && Number.isFinite(Number(parcel.baths)) ? Number(parcel.baths) : null,
            parcel.squareFeet != null && Number.isFinite(Number(parcel.squareFeet)) ? Number(parcel.squareFeet) : null,
            parcel.estimate != null && Number.isFinite(Number(parcel.estimate)) ? Number(parcel.estimate) : null,
            parcel.estimate != null && Number.isFinite(Number(parcel.estimate)) ? Number(parcel.estimate) : null,
            JSON.stringify(Array.isArray(parcel.photos) ? parcel.photos : []),
            JSON.stringify(Array.isArray(parcel.features) ? parcel.features : []),
            'not_listed',
            false,
            false,
            true,
            false,
            now,
            now,
          ]
        );
        return res.status(201).json({ id });
      } catch (err) {
        console.warn('[api/properties claim]', err?.message || err);
        return res.status(500).json({ error: err?.message || 'Server error' });
      }
    }

    const id = body.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const sellerId = body.sellerId;
    if (!sellerId) return res.status(400).json({ error: 'Missing sellerId' });

    const created = parseDate(body.createdAt) || new Date();
    const updated = parseDate(body.updatedAt) || new Date();
    const photos = Array.isArray(body.photos) ? body.photos : [];
    const features = Array.isArray(body.features) ? body.features : [];

    try {
      await query(
        `INSERT INTO properties (
          id, seller_id, address, city, state, zip_code, latitude, longitude, attom_id,
          property_type, bedrooms, bathrooms, square_feet, price, funk_estimate, photos, features,
          status, available_for_sale, accepting_offers, accepting_communications, archived, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO NOTHING`,
        [
          id,
          sellerId,
          body.address ?? null,
          body.city ?? null,
          body.state ?? null,
          body.zipCode ?? null,
          body.latitude ?? null,
          body.longitude ?? null,
          body.attomId ?? null,
          body.propertyType ?? null,
          body.bedrooms ?? null,
          body.bathrooms ?? null,
          body.squareFeet ?? null,
          body.price ?? null,
          body.funkEstimate ?? null,
          JSON.stringify(photos),
          JSON.stringify(features),
          body.status || 'active',
          body.availableForSale === true,
          body.acceptingOffers === true,
          body.acceptingCommunications !== false,
          body.archived === true,
          created,
          updated,
        ]
      );
      return res.status(201).json({ id });
    } catch (err) {
      console.warn('[api/properties create]', err?.message || err);
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
    const allowed = [
      'address', 'city', 'state', 'zipCode', 'latitude', 'longitude', 'attomId', 'propertyType',
      'bedrooms', 'bathrooms', 'squareFeet', 'price', 'funkEstimate', 'photos', 'features',
      'status', 'availableForSale', 'acceptingOffers', 'acceptingCommunications', 'archived'
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (body[k] !== undefined) updates[k] = body[k];
    });
    if (Object.keys(updates).length === 0) return res.status(200).json({ id });

    const setCols = [];
    const params = [];
    let idx = 0;
    const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    Object.entries(updates).forEach(([k, v]) => {
      idx++;
      const col = snake(k);
      if (col === 'photos' || col === 'features') {
        setCols.push(`${col} = $${idx}`);
        params.push(JSON.stringify(Array.isArray(v) ? v : (v && typeof v === 'object' ? v : [])));
      } else if (col === 'available_for_sale' || col === 'accepting_offers' || col === 'accepting_communications' || col === 'archived') {
        setCols.push(`${col} = $${idx}`);
        params.push(v === true);
      } else if (k === 'bedrooms' || k === 'squareFeet') {
        setCols.push(`${snake(k)} = $${idx}`);
        params.push(v == null ? null : Number(v));
      } else if (k === 'bathrooms' || k === 'price' || k === 'funkEstimate') {
        setCols.push(`${snake(k)} = $${idx}`);
        params.push(v == null ? null : Number(v));
      } else {
        setCols.push(`${col} = $${idx}`);
        params.push(v);
      }
    });
    idx++;
    setCols.push('updated_at = now()');
    params.push(id);
    try {
      await query(
        `UPDATE properties SET ${setCols.join(', ')} WHERE id = $${idx}`,
        params
      );
      return res.status(200).json({ id });
    } catch (err) {
      console.warn('[api/properties patch]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    let body = {};
    try {
      body = parseBody(req);
    } catch (_) {}
    const id = (req.query && req.query.id) ? req.query.id : body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      if (body.permanent === true) {
        await query('DELETE FROM properties WHERE id = $1', [id]);
      } else {
        await query('UPDATE properties SET status = $1, updated_at = now() WHERE id = $2', ['withdrawn', id]);
      }
      return res.status(200).json({ id });
    } catch (err) {
      console.warn('[api/properties delete]', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
