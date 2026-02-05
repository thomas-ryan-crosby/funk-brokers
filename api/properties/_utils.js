/** Normalize JSON/JSONB column to array (pg can return string or object). */
function normalizeJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Array.isArray(val) ? val : (Array.isArray(val) ? val : []);
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (_) { return []; }
  }
  return [];
}

/**
 * Map Postgres property row to client shape (camelCase).
 */
function mapRowToProperty(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    latitude: row.latitude,
    longitude: row.longitude,
    attomId: row.attom_id,
    propertyType: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms != null ? Number(row.bathrooms) : null,
    squareFeet: row.square_feet,
    price: row.price != null ? Number(row.price) : null,
    funkEstimate: row.funk_estimate != null ? Number(row.funk_estimate) : null,
    photos: normalizeJsonArray(row.photos),
    features: normalizeJsonArray(row.features),
    status: row.status,
    availableForSale: row.available_for_sale === true,
    acceptingOffers: row.accepting_offers === true,
    acceptingCommunications: row.accepting_communications !== false,
    archived: row.archived === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Extended fields (migration 008)
    description: row.description ?? undefined,
    lotSize: row.lot_size != null ? Number(row.lot_size) : null,
    yearBuilt: row.year_built != null ? Number(row.year_built) : null,
    hoaFee: row.hoa_fee != null ? Number(row.hoa_fee) : null,
    propertyTax: row.property_tax != null ? Number(row.property_tax) : null,
    imGonePrice: row.im_gone_price != null ? Number(row.im_gone_price) : null,
    hasHOA: row.has_hoa === true,
    deedUrl: row.deed_url ?? undefined,
    propertyTaxRecordUrl: row.property_tax_record_url ?? undefined,
    hoaDocsUrl: row.hoa_docs_url ?? undefined,
    disclosureFormsUrl: row.disclosure_forms_url ?? undefined,
    inspectionReportUrl: row.inspection_report_url ?? undefined,
    sellerName: row.seller_name ?? undefined,
    sellerEmail: row.seller_email ?? undefined,
    professionalPhotos: row.professional_photos === true,
  };
}

function parseDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse limit query param, default 75, max 200 */
function parseLimit(value, fallback = 75, max = 200) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

module.exports = { mapRowToProperty, parseDate, parseLimit, normalizeJsonArray };
