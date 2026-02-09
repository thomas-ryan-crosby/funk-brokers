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
    const listedStatus = (req.query && req.query.listedStatus) ? req.query.listedStatus : null;

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
      if (listedStatus === 'listed') {
        conditions.push(`available_for_sale = true AND status IN ('active', 'under_contract')`);
      } else if (listedStatus === 'not_listed') {
        conditions.push(`(available_for_sale = false OR status = 'not_listed' OR status NOT IN ('active', 'under_contract'))`);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      paramIdx++;
      params.push(limit);
      sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
      const result = await query(sql, params);
      const list = result.rows.map(mapRowToProperty).filter(Boolean);
      return res.status(200).json({ properties: list });
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

        // ATTOM enrichment: fetch snapshot, normalize, store (non-blocking on failure)
        const lat = parcel.latitude;
        const lng = parcel.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          try {
            const { attomFetchSnapshot, resolveAttomIdFromSnapshot, normalizeAddress: normalizeAddr } = require('../_attom');
            const { normalizeAttomSnapshot } = require('../_attomNormalizer');
            const delta = 0.002;
            const data = await attomFetchSnapshot({ n: lat + delta, s: lat - delta, e: lng + delta, w: lng - delta });
            const normalizedAddr = parcel.address ? normalizeAddr(parcel.address) : null;
            const match = resolveAttomIdFromSnapshot(data, normalizedAddr);
            const snapshot = normalizeAttomSnapshot(data);
            const attomId = match?.attomId ?? null;
            const funkEstimate = snapshot?.valuation?.avmValue ?? match?.estimate ?? null;
            console.log('[claim] ATTOM snapshot retrieved:', JSON.stringify(snapshot, null, 2));

            await query(
              `UPDATE properties SET attom_id = COALESCE(attom_id, $1), attom_snapshot = $2,
               funk_estimate = COALESCE(funk_estimate, $3), updated_at = now() WHERE id = $4`,
              [attomId, JSON.stringify(snapshot), funkEstimate, id]
            );
          } catch (enrichErr) {
            console.warn('[claim] ATTOM enrichment failed (claim still succeeded):', enrichErr.message);
          }
        }

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
    const photos = Array.isArray(body.photos) ? body.photos : (Array.isArray(body.photoUrls) ? body.photoUrls : []);
    const features = Array.isArray(body.features) ? body.features : [];

    try {
      await query(
        `INSERT INTO properties (
          id, seller_id, address, city, state, zip_code, latitude, longitude, attom_id,
          property_type, bedrooms, bathrooms, square_feet, price, funk_estimate, photos, features,
          status, available_for_sale, accepting_offers, accepting_communications, archived, created_at, updated_at,
          description, lot_size, year_built, hoa_fee, property_tax, im_gone_price, has_hoa,
          deed_url, property_tax_record_url, hoa_docs_url, disclosure_forms_url, inspection_report_url,
          seller_name, seller_email, professional_photos
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
        )
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
          body.description ?? null,
          body.lotSize != null ? Number(body.lotSize) : null,
          body.yearBuilt != null ? Number(body.yearBuilt) : null,
          body.hoaFee != null ? Number(body.hoaFee) : null,
          body.propertyTax != null ? Number(body.propertyTax) : null,
          body.imGonePrice != null ? Number(body.imGonePrice) : null,
          body.hasHOA === true,
          body.deedUrl ?? null,
          body.propertyTaxRecordUrl ?? null,
          body.hoaDocsUrl ?? null,
          body.disclosureFormsUrl ?? null,
          body.inspectionReportUrl ?? null,
          body.sellerName ?? null,
          body.sellerEmail ?? null,
          body.professionalPhotos === true,
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
      'bedrooms', 'bathrooms', 'squareFeet', 'price', 'photos', 'features',
      'status', 'availableForSale', 'acceptingOffers', 'acceptingCommunications', 'archived',
      'description', 'lotSize', 'yearBuilt', 'hoaFee', 'propertyTax', 'imGonePrice', 'hasHOA', 'has_h_o_a',
      'deedUrl', 'propertyTaxRecordUrl', 'hoaDocsUrl', 'disclosureFormsUrl', 'inspectionReportUrl',
      'sellerName', 'sellerEmail', 'professionalPhotos',
      'estimatedWorth', 'makeMeMovePrice', 'hasInsurance', 'insuranceApproximation',
      'hasMortgage', 'remainingMortgage', 'mortgageDocUrl', 'payoffOrLienReleaseUrl',
      'lienTax', 'lienHOA', 'lienMechanic', 'lienOtherDetails',
      'attomSnapshot',
      'verifiedComps', 'videoFiles', 'floorPlanUrl', 'valuationDocUrl', 'compReportUrl',
      'matterportTourUrl', 'hasInsuranceClaims', 'insuranceClaimsDescription', 'insuranceClaimsReportUrl',
      'legalDescription',
      'verified', 'verifiedAt',
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (body[k] !== undefined) updates[k] = body[k];
    });
    // Normalize body keys that may arrive as has_h_o_a from some clients
    if (updates.has_h_o_a !== undefined && updates.hasHOA === undefined) {
      updates.hasHOA = updates.has_h_o_a;
      delete updates.has_h_o_a;
    }
    if (Object.keys(updates).length === 0) return res.status(200).json({ id });

    const setCols = [];
    const params = [];
    let idx = 0;
    const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    // Normalize column names (some clients/middleware send has_h_o_a instead of has_hoa)
    const colAliases = { has_h_o_a: 'has_hoa' };
    const toCol = (key) => colAliases[snake(key)] ?? snake(key);
    Object.entries(updates).forEach(([k, v]) => {
      idx++;
      const col = toCol(k);
      if (col === 'photos' || col === 'features' || col === 'verified_comps' || col === 'video_files' || col === 'attom_snapshot') {
        setCols.push(`${col} = $${idx}`);
        params.push(JSON.stringify(Array.isArray(v) ? v : (v && typeof v === 'object' ? v : [])));
      } else if (col === 'available_for_sale' || col === 'accepting_offers' || col === 'accepting_communications' || col === 'archived' || col === 'has_hoa' || col === 'professional_photos' || col === 'has_insurance' || col === 'has_mortgage' || col === 'lien_tax' || col === 'lien_hoa' || col === 'lien_mechanic' || col === 'has_insurance_claims' || col === 'verified') {
        setCols.push(`${col} = $${idx}`);
        params.push(v === true);
      } else if (k === 'bedrooms' || k === 'squareFeet' || k === 'yearBuilt') {
        setCols.push(`${snake(k)} = $${idx}`);
        params.push(v == null ? null : Number(v));
      } else if (k === 'bathrooms' || k === 'price' || k === 'lotSize' || k === 'hoaFee' || k === 'propertyTax' || k === 'imGonePrice' || k === 'estimatedWorth' || k === 'makeMeMovePrice' || k === 'insuranceApproximation' || k === 'remainingMortgage') {
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
