import { firebaseConfig } from '../config/firebase-config';
import { get as cacheGet, set as cacheSet } from '../utils/ttlCache';
import metrics from '../utils/metrics';

const FUNCTIONS_BASE = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

const TTL_MAP_MS = 5 * 60 * 1000;   // 5 min – map tiles
const TTL_ADDR_MS = 10 * 60 * 1000; // 10 min – address resolution
const TTL_SNAPSHOT_MS = 10 * 60 * 1000; // 10 min – property snapshot

/** In-flight request coalescing: same key returns same promise (Firestore/ATTOM cost control). */
const inFlightMap = new Map();
const inFlightAddr = new Map();
const inFlightSnap = new Map();

function round4(v) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v;
}

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
    const url = `${FUNCTIONS_BASE}/getMapParcels?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `getMapParcels: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_MAP_MS);
    metrics.recordAttomCall('mapParcels', Date.now() - startMs);
    return data;
  })();
  inFlightMap.set(cacheKey, promise);
  promise.finally(() => inFlightMap.delete(cacheKey));
  return promise;
};

export const resolveAddressToParcel = async ({ address, bounds }) => {
  if (!address || !bounds) {
    return { attomId: null, parcel: null };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const boundsStr = `${round4(ne.lat())}_${round4(sw.lat())}_${round4(ne.lng())}_${round4(sw.lng())}`;
  const cacheKey = `addr_${String(address).trim().toLowerCase()}_${boundsStr}`;
  const cached = cacheGet(cacheKey, TTL_ADDR_MS);
  if (cached != null) return cached;
  let promise = inFlightAddr.get(cacheKey);
  if (promise) return promise;
  promise = (async () => {
    const startMs = Date.now();
    const body = {
      address,
      n: ne.lat(),
      s: sw.lat(),
      e: ne.lng(),
      w: sw.lng(),
    };
    const url = `${FUNCTIONS_BASE}/resolveAddress`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `resolveAddress: ${res.status}`);
    }
    const data = await res.json();
    cacheSet(cacheKey, data, TTL_ADDR_MS);
    metrics.recordAttomCall('resolveAddress', Date.now() - startMs);
    return data;
  })();
  inFlightAddr.set(cacheKey, promise);
  promise.finally(() => inFlightAddr.delete(cacheKey));
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
    const url = `${FUNCTIONS_BASE}/getPropertySnapshot?${params}`;
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
