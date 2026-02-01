import { firebaseConfig } from '../config/firebase-config';

const FUNCTIONS_BASE = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

export const getMapParcels = async ({ bounds, zoom }) => {
  if (!bounds || typeof bounds.getNorthEast !== 'function') {
    return { parcels: [] };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const n = ne.lat();
  const s = sw.lat();
  const e = ne.lng();
  const w = sw.lng();
  const params = new URLSearchParams({ n, s, e, w, zoom });
  const url = `${FUNCTIONS_BASE}/getMapParcels?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `getMapParcels: ${res.status}`);
  }
  return res.json();
};

export const resolveAddressToParcel = async ({ address, bounds }) => {
  if (!address || !bounds) {
    return { attomId: null, parcel: null };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
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
  return res.json();
};

export const getPropertySnapshot = async ({ attomId, latitude, longitude }) => {
  if (!attomId) {
    return { payload: null };
  }
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
  return res.json();
};
