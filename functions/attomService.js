const admin = require('firebase-admin');

const ATTOM_BASE = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot';

const MAP_TILE_TTL_MS = 30 * 60 * 1000;
const ADDRESS_TTL_MS = 120 * 24 * 60 * 60 * 1000;
const PROPERTY_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

const singleflight = new Map();
const inMemoryTiles = new Map();
const inMemorySnapshots = new Map();
const inMemoryAddress = new Map();
const rateBuckets = new Map();

const ensureAdmin = () => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
};

const now = () => Date.now();

const normalizeAddress = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getDb = () => {
  ensureAdmin();
  return admin.firestore();
};

const toRadians = (deg) => (deg * Math.PI) / 180;

const latLngToTile = (lat, lng, zoom) => {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = toRadians(lat);
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale
  );
  return { x, y };
};

const tileKeyForCenter = (lat, lng, zoom) => {
  const { x, y } = latLngToTile(lat, lng, zoom);
  return `${zoom}:${x}:${y}`;
};

const radiusFromBbox = (n, s, e, w) => {
  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const latDeg = n - s;
  const lngDeg = Math.abs(e - w) * Math.cos((centerLat * Math.PI) / 180);
  const radiusMiles = 69 * 0.5 * Math.max(latDeg, lngDeg);
  return Math.max(0.25, Math.min(20, radiusMiles));
};

const mapAttomToParcel = (p, index) => {
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
    propertyType: p?.summary?.proptype || p?.summary?.proptype || null,
    beds: rooms.beds ?? p.beds ?? null,
    baths: rooms.bathstotal ?? p.bathstotal ?? null,
    squareFeet: size.universalsize ?? size.buildingSize ?? size.buildingsize ?? p.squarefeet ?? null,
  };
};

const mapAttomToAddressParcel = (p, index) => {
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
};

const mapAttomToLightweight = (list) =>
  list
    .map((p, i) => mapAttomToParcel(p, i))
    .filter(Boolean);

const getApiKey = () => process.env.ATTOM_API_KEY || (require('firebase-functions').config().attom?.api_key);

const attomFetchSnapshot = async ({ n, s, e, w }) => {
  const apiKey = getApiKey();
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
};

const singleflightWrap = async (key, handler) => {
  if (singleflight.has(key)) {
    return singleflight.get(key);
  }
  const promise = handler().finally(() => singleflight.delete(key));
  singleflight.set(key, promise);
  return promise;
};

const isExpired = (expiresAt) => !expiresAt || expiresAt <= now();

const getCachedDoc = async (collection, docId) => {
  const db = getDb();
  const snap = await db.collection(collection).doc(docId).get();
  if (!snap.exists) return null;
  return snap.data();
};

const setCachedDoc = async (collection, docId, payload) => {
  const db = getDb();
  await db.collection(collection).doc(docId).set(payload, { merge: true });
};

const checkRateLimit = (key, limitMs) => {
  const last = rateBuckets.get(key) || 0;
  if (now() - last < limitMs) return false;
  rateBuckets.set(key, now());
  return true;
};

const cacheMapTile = async (tileKey, payload) => {
  const record = {
    tileKey,
    payload,
    fetchedAt: now(),
    expiresAt: now() + MAP_TILE_TTL_MS,
  };
  inMemoryTiles.set(tileKey, record);
  await setCachedDoc('map_search_snapshot', tileKey, record);
  return record;
};

const readMapTile = async (tileKey) => {
  const memory = inMemoryTiles.get(tileKey);
  if (memory && !isExpired(memory.expiresAt)) return { record: memory, cache: 'memory' };
  const record = await getCachedDoc('map_search_snapshot', tileKey);
  if (record && !isExpired(record.expiresAt)) {
    inMemoryTiles.set(tileKey, record);
    return { record, cache: 'firestore' };
  }
  return { record: null, cache: 'miss' };
};

const cacheAddressMapping = async (addressKey, payload) => {
  const record = {
    addressKey,
    ...payload,
    fetchedAt: now(),
    expiresAt: now() + ADDRESS_TTL_MS,
  };
  inMemoryAddress.set(addressKey, record);
  await setCachedDoc('address_attom_map', addressKey, record);
  return record;
};

const readAddressMapping = async (addressKey) => {
  const memory = inMemoryAddress.get(addressKey);
  if (memory && !isExpired(memory.expiresAt)) return { record: memory, cache: 'memory' };
  const record = await getCachedDoc('address_attom_map', addressKey);
  if (record && !isExpired(record.expiresAt)) {
    inMemoryAddress.set(addressKey, record);
    return { record, cache: 'firestore' };
  }
  return { record: null, cache: 'miss' };
};

const cacheSnapshot = async (attomId, payload, meta) => {
  const record = {
    attomId,
    payload,
    fetchedAt: now(),
    expiresAt: now() + PROPERTY_DEFAULT_TTL_MS,
    meta,
  };
  inMemorySnapshots.set(attomId, record);
  await setCachedDoc('property_snapshots', attomId, record);
  return record;
};

const readSnapshot = async (attomId) => {
  const memory = inMemorySnapshots.get(attomId);
  if (memory) return { record: memory, cache: 'memory' };
  const record = await getCachedDoc('property_snapshots', attomId);
  if (record) {
    inMemorySnapshots.set(attomId, record);
    return { record, cache: 'firestore' };
  }
  return { record: null, cache: 'miss' };
};

const buildSectionExpiry = () => {
  const base = now();
  return Object.entries(DEFAULT_SECTION_TTLS_MS).reduce((acc, [key, ttl]) => {
    acc[key] = base + ttl;
    return acc;
  }, {});
};

const resolveAttomIdFromSnapshot = (data, normalizedAddress) => {
  const list = data.property ?? data.properties ?? data ?? [];
  const arr = Array.isArray(list) ? list : [list];
  const mapped = arr.map((p, i) => mapAttomToAddressParcel(p, i)).filter(Boolean);
  if (!mapped.length) return null;
  if (!normalizedAddress) return mapped[0];
  const match = mapped.find((p) => normalizeAddress(p.address).includes(normalizedAddress));
  return match || mapped[0];
};

const getMapParcels = async ({ bounds, zoom, requesterKey }) => {
  const { n, s, e, w } = bounds;
  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const tileKey = tileKeyForCenter(centerLat, centerLng, zoom);

  const rateOk = checkRateLimit(`${requesterKey}:${tileKey}`, 600);
  if (!rateOk) {
    return { parcels: [], tileKey, cache: 'rate_limited', suppressed: true };
  }

  const { record, cache } = await readMapTile(tileKey);
  if (record && !isExpired(record.expiresAt)) {
    return { parcels: record.payload, tileKey, cache };
  }

  return singleflightWrap(`map:${tileKey}`, async () => {
    const { record: refreshed } = await readMapTile(tileKey);
    if (refreshed && !isExpired(refreshed.expiresAt)) {
      return { parcels: refreshed.payload, tileKey, cache: 'singleflight' };
    }
    const data = await attomFetchSnapshot({ n, s, e, w });
    const list = data.property ?? data.properties ?? data ?? [];
    const arr = Array.isArray(list) ? list : [list];
    const parcels = mapAttomToLightweight(arr);
    const stored = await cacheMapTile(tileKey, parcels);
    console.log('[attom][map]', { tileKey, cache: 'miss', count: parcels.length });
    return { parcels: stored.payload, tileKey, cache: 'miss' };
  });
};

const resolveAddress = async ({ address, bounds }) => {
  const normalized = normalizeAddress(address);
  const addressKey = normalized || `lat:${bounds.n}-${bounds.e}`;
  const { record, cache } = await readAddressMapping(addressKey);
  if (record && !isExpired(record.expiresAt)) {
    return { ...record, cache };
  }

  return singleflightWrap(`addr:${addressKey}`, async () => {
    const { record: refreshed } = await readAddressMapping(addressKey);
    if (refreshed && !isExpired(refreshed.expiresAt)) {
      return { ...refreshed, cache: 'singleflight' };
    }
    const data = await attomFetchSnapshot(bounds);
    const match = resolveAttomIdFromSnapshot(data, normalized);
    if (!match) return null;
    await cacheSnapshot(match.attomId, data, { sectionExpiry: buildSectionExpiry(), hint: { latitude: match.latitude, longitude: match.longitude } });
    const stored = await cacheAddressMapping(addressKey, {
      attomId: match.attomId,
      parcel: match,
    });
    console.log('[attom][address]', { addressKey, cache: 'miss', attomId: match.attomId });
    return { ...stored, cache: 'miss' };
  });
};

const refreshSnapshot = async ({ attomId, latitude, longitude }) => {
  const delta = 0.002;
  const data = await attomFetchSnapshot({
    n: latitude + delta,
    s: latitude - delta,
    e: longitude + delta,
    w: longitude - delta,
  });
  return cacheSnapshot(attomId, data, { sectionExpiry: buildSectionExpiry(), hint: { latitude, longitude } });
};

const getPropertySnapshot = async ({ attomId, latitude, longitude }) => {
  const { record, cache } = await readSnapshot(attomId);
  if (record && !isExpired(record.expiresAt)) {
    return { ...record, cache };
  }
  const hintLat = record?.meta?.hint?.latitude ?? latitude;
  const hintLng = record?.meta?.hint?.longitude ?? longitude;
  if (record && isExpired(record.expiresAt)) {
    if (Number.isFinite(hintLat) && Number.isFinite(hintLng)) {
      singleflightWrap(`snapshot-refresh:${attomId}`, async () => {
        try {
          await refreshSnapshot({ attomId, latitude: hintLat, longitude: hintLng });
          console.log('[attom][snapshot]', { attomId, cache: 'stale-revalidated' });
        } catch (err) {
          console.error('[attom][snapshot] refresh failed', err);
        }
      });
    }
    return { ...record, cache: 'stale' };
  }

  return singleflightWrap(`snapshot:${attomId}`, async () => {
    const { record: refreshed } = await readSnapshot(attomId);
    if (refreshed && !isExpired(refreshed.expiresAt)) {
      return { ...refreshed, cache: 'singleflight' };
    }
    if (!Number.isFinite(hintLat) || !Number.isFinite(hintLng)) {
      throw new Error('Latitude/longitude required to fetch snapshot.');
    }
    const stored = await refreshSnapshot({ attomId, latitude: hintLat, longitude: hintLng });
    console.log('[attom][snapshot]', { attomId, cache: 'miss' });
    return { ...stored, cache: 'miss' };
  });
};

module.exports = {
  normalizeAddress,
  getMapParcels,
  resolveAddress,
  getPropertySnapshot,
};
