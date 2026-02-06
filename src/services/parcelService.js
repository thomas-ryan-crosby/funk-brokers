import { get as cacheGet, set as cacheSet } from '../utils/ttlCache';
import metrics from '../utils/metrics';

/** Use Vercel API for ATTOM. */
function getAttomBase() {
  if (typeof window === 'undefined') return null;
  return (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '') + '/api/attom';
}

/** Use Vercel API for OpenAddresses. */
function getAddressesBase() {
  if (typeof window === 'undefined') return null;
  return (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '') + '/api/addresses';
}

const TTL_MAP_MS = 5 * 60 * 1000;   // 5 min – map tiles (CompsMap / ATTOM)
const TTL_ADDR_MAP_MS = 10 * 60 * 1000; // 10 min – OpenAddresses map pins
const TTL_LOOKUP_MS = 10 * 60 * 1000; // 10 min – on-demand ATTOM lookup
const TTL_SNAPSHOT_MS = 10 * 60 * 1000; // 10 min – property snapshot

/** In-flight request coalescing: same key returns same promise (Firestore/ATTOM cost control). */
const inFlightMap = new Map();
const inFlightAddrMap = new Map();
const inFlightLookup = new Map();
const inFlightSnap = new Map();

function round4(v) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v;
}

/** CompsMap still uses ATTOM data for beds/baths/sqft. */
export const getMapParcels = async ({ bounds, zoom }) => {
  if (!bounds || typeof bounds.getNorthEast !== 'function') {
    return { parcels: [] };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const n = round4(ne.lat());
  const s = round4(sw.lat());
  const e = round4(ne.lng());
  const w = round4(sw.lng());
  const cacheKey = `map_${n}_${s}_${e}_${w}_${zoom}`;
  const cached = cacheGet(cacheKey, TTL_MAP_MS);
  if (cached != null) return cached;
  let promise = inFlightMap.get(cacheKey);
  if (promise) return promise;
  promise = (async () => {
    const startMs = Date.now();
    const params = new URLSearchParams({ n, s, e, w, zoom });
    const base = getAttomBase();
    const url = base ? `${base}/map?${params}` : null;
    if (!url) throw new Error('Configure VITE_API_BASE for map parcels');
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `getMapParcels: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_MAP_MS);
    metrics.recordAttomCall('mapParcels', Date.now() - startMs);
    metrics.recordReadByFeature('map', 1);
    return data;
  })();
  inFlightMap.set(cacheKey, promise);
  promise.finally(() => inFlightMap.delete(cacheKey));
  return promise;
};

/** Browse map — OpenAddresses pins (address only, no beds/baths/sqft). */
export const getMapAddresses = async ({ bounds, zoom }) => {
  if (!bounds || typeof bounds.getNorthEast !== 'function') {
    return { addresses: [] };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const n = round4(ne.lat());
  const s = round4(sw.lat());
  const e = round4(ne.lng());
  const w = round4(sw.lng());
  const cacheKey = `oa_map_${n}_${s}_${e}_${w}_${zoom}`;
  const cached = cacheGet(cacheKey, TTL_ADDR_MAP_MS);
  if (cached != null) return cached;
  let promise = inFlightAddrMap.get(cacheKey);
  if (promise) return promise;
  promise = (async () => {
    const params = new URLSearchParams({ n, s, e, w, zoom });
    const base = getAddressesBase();
    const url = base ? `${base}/map?${params}` : null;
    if (!url) throw new Error('Configure VITE_API_BASE for address map');
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `getMapAddresses: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_ADDR_MAP_MS);
    return data;
  })();
  inFlightAddrMap.set(cacheKey, promise);
  promise.finally(() => inFlightAddrMap.delete(cacheKey));
  return promise;
};

/** On-demand ATTOM lookup by lat/lng — called when user clicks a specific address pin. */
export const lookupParcelByLocation = async ({ latitude, longitude, address }) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { attomId: null, parcel: null };
  }
  const rLat = round4(latitude);
  const rLng = round4(longitude);
  const cacheKey = `lookup_${rLat}_${rLng}`;
  const cached = cacheGet(cacheKey, TTL_LOOKUP_MS);
  if (cached != null) return cached;
  let promise = inFlightLookup.get(cacheKey);
  if (promise) return promise;
  promise = (async () => {
    const startMs = Date.now();
    const params = new URLSearchParams({ lat: latitude, lng: longitude });
    if (address) params.set('address', address);
    const base = getAttomBase();
    const url = base ? `${base}/lookup?${params}` : null;
    if (!url) throw new Error('Configure VITE_API_BASE for parcel lookup');
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `lookupParcelByLocation: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_LOOKUP_MS);
    metrics.recordAttomCall('lookupParcel', Date.now() - startMs);
    return data;
  })();
  inFlightLookup.set(cacheKey, promise);
  promise.finally(() => inFlightLookup.delete(cacheKey));
  return promise;
};

export const getPropertySnapshot = async ({ attomId, latitude, longitude }) => {
  if (!attomId) {
    return { payload: null };
  }
  const cacheKey = `snap_${attomId}`;
  const cached = cacheGet(cacheKey, TTL_SNAPSHOT_MS);
  if (cached != null) return cached;
  let promise = inFlightSnap.get(cacheKey);
  if (promise) return promise;
  promise = (async () => {
    const startMs = Date.now();
    const params = new URLSearchParams({
      attomId,
      lat: latitude,
      lng: longitude,
    });
    const base = getAttomBase();
    const url = base ? `${base}/snapshot?${params}` : null;
    if (!url) throw new Error('Configure VITE_API_BASE for property snapshot');
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `getPropertySnapshot: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_SNAPSHOT_MS);
    metrics.recordAttomCall('propertySnapshot', Date.now() - startMs);
    return data;
  })();
  inFlightSnap.set(cacheKey, promise);
  promise.finally(() => inFlightSnap.delete(cacheKey));
  return promise;
};
