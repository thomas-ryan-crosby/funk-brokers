/**
 * ATTOM API logic for Vercel API (Wave 2). No Firestore; cache is in route handlers via Redis.
 */

const ATTOM_BASE = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot';

function normalizeAddress(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function latLngToTile(lat, lng, zoom) {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = toRadians(lat);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  );
  return { x, y };
}

function tileKeyForCenter(lat, lng, zoom) {
  const { x, y } = latLngToTile(lat, lng, zoom);
  return `${zoom}:${x}:${y}`;
}

function radiusFromBbox(n, s, e, w) {
  const centerLat = (n + s) / 2;
  const latDeg = n - s;
  const lngDeg = Math.abs(e - w) * Math.cos((centerLat * Math.PI) / 180);
  const radiusMiles = 69 * 0.5 * Math.max(latDeg, lngDeg);
  return Math.max(0.25, Math.min(20, radiusMiles));
}

function mapAttomToParcel(p, index) {
  const addr = p.address || {};
  const parts = [
    addr.line1 || addr.line2,
    addr.locality,
    addr.adminarea || addr.region,
    addr.postal1 || addr.postalcode,
  ].filter(Boolean);
  const address = parts.length > 0 ? parts.join(', ') : 'Address unknown';

  const lat = p.location?.latitude ?? p.latitude;
  const lng = p.location?.longitude ?? p.longitude;
  if (lat == null || lng == null) return null;

  const rooms = p.building?.rooms ?? p.building ?? {};
  const size = p.building?.size ?? p.building ?? {};

  const attomId = p.identifier?.Id ?? p.identifier?.id ?? p.id ?? p.attomId ?? `p-${index}`;

  return {
    address,
    latitude: Number(lat),
    longitude: Number(lng),
    attomId: String(attomId),
    thumbnail: null,
    propertyType: p?.summary?.proptype ?? null,
    beds: rooms.beds ?? p.beds ?? null,
    baths: rooms.bathstotal ?? p.bathstotal ?? null,
    squareFeet: size.universalsize ?? size.buildingSize ?? size.buildingsize ?? p.squarefeet ?? null,
  };
}

function mapAttomToAddressParcel(p, index) {
  const base = mapAttomToParcel(p, index);
  if (!base) return null;
  const avm = p.avm?.amount ?? p.avm;
  const estimate = avm?.value ?? avm?.amount ?? null;
  const sale = p.sale ?? {};
  const saleAmt = sale.amount?.saleAmt ?? sale.amount?.saleamt ?? sale.saleamt ?? sale.saleAmt ?? null;
  const saleDate = sale.saleSearchDate ?? sale.salesearchdate ?? sale.saleTransDate ?? sale.saletransdate ?? null;
  return {
    ...base,
    estimate: estimate != null ? Number(estimate) : null,
    lastSalePrice: saleAmt != null ? Number(saleAmt) : null,
    lastSaleDate: saleDate != null ? String(saleDate) : null,
  };
}

function mapAttomToLightweight(list) {
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((p, i) => mapAttomToParcel(p, i)).filter(Boolean);
}

function resolveAttomIdFromSnapshot(data, normalizedAddress) {
  const list = data.property ?? data.properties ?? data ?? [];
  const arr = Array.isArray(list) ? list : [list];
  const mapped = arr.map((p, i) => mapAttomToAddressParcel(p, i)).filter(Boolean);
  if (!mapped.length) return null;
  if (!normalizedAddress) return mapped[0];
  const match = mapped.find((p) => normalizeAddress(p.address).includes(normalizedAddress));
  return match || mapped[0];
}

async function attomFetchSnapshot({ n, s, e, w }) {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) throw new Error('ATTOM API key not configured');
  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const radius = radiusFromBbox(n, s, e, w);
  const url = `${ATTOM_BASE}?latitude=${centerLat}&longitude=${centerLng}&radius=${radius}`;
  const response = await fetch(url, { headers: { Accept: 'application/json', APIKey: apiKey } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ATTOM API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

const DEFAULT_SECTION_TTLS_MS = {
  valuation: 3 * 24 * 60 * 60 * 1000,
  equity: 3 * 24 * 60 * 60 * 1000,
  distress: 3 * 24 * 60 * 60 * 1000,
  tax: 90 * 24 * 60 * 60 * 1000,
  ownership: 60 * 24 * 60 * 60 * 1000,
  mortgage: 60 * 24 * 60 * 60 * 1000,
  sales: 60 * 24 * 60 * 60 * 1000,
  physical: 90 * 24 * 60 * 60 * 1000,
};

function buildSectionExpiry() {
  const base = Date.now();
  return Object.entries(DEFAULT_SECTION_TTLS_MS).reduce((acc, [key, ttl]) => {
    acc[key] = base + ttl;
    return acc;
  }, {});
}

module.exports = {
  normalizeAddress,
  tileKeyForCenter,
  radiusFromBbox,
  mapAttomToParcel,
  mapAttomToAddressParcel,
  mapAttomToLightweight,
  resolveAttomIdFromSnapshot,
  attomFetchSnapshot,
  buildSectionExpiry,
};
