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
    bathrooms: row.bathrooms,
    squareFeet: row.square_feet,
    price: row.price != null ? Number(row.price) : null,
    funkEstimate: row.funk_estimate != null ? Number(row.funk_estimate) : null,
    photos: Array.isArray(row.photos) ? row.photos : (row.photos && typeof row.photos === 'object' ? row.photos : []),
    features: Array.isArray(row.features) ? row.features : (row.features && typeof row.features === 'object' ? row.features : []),
    status: row.status,
    availableForSale: row.available_for_sale === true,
    acceptingOffers: row.accepting_offers === true,
    acceptingCommunications: row.accepting_communications !== false,
    archived: row.archived === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

module.exports = { mapRowToProperty, parseDate, parseLimit };
