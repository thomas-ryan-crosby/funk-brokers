import { firebaseConfig } from '../config/firebase-config';

const FUNCTIONS_BASE = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

/**
 * @param {google.maps.LatLngBounds} bounds
 * @returns {Promise<{ parcels: Array<{ address, latitude, longitude, estimate?, lastSaleDate?, lastSalePrice?, attomId, beds?, baths?, squareFeet? }> }>}
 */
export async function getParcelsInViewport(bounds) {
  if (!bounds || typeof bounds.getNorthEast !== 'function') {
    return { parcels: [] };
  }
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const n = ne.lat();
  const s = sw.lat();
  const e = ne.lng();
  const w = sw.lng();
  const params = new URLSearchParams({ n, s, e, w });
  const url = `${FUNCTIONS_BASE}/getParcelsInViewport?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `getParcelsInViewport: ${res.status}`);
  }
  return res.json();
}
