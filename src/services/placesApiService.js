/**
 * Client-side Places API. Calls /api/places/* so Google key stays server-side only.
 */

import metrics from '../utils/metrics';

function getPlacesBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/places`;
}

/**
 * @param {string} input
 * @param {string} [sessionToken]
 * @returns {Promise<Array<{ place_id: string, description: string }>>}
 */
export async function getPredictions(input, sessionToken) {
  const url = `${getPlacesBase()}/autocomplete`;
  const body = { input: String(input || '').trim(), types: 'address', components: 'country:us' };
  if (sessionToken) body.sessionToken = sessionToken;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places autocomplete: ${res.status}`);
  const data = await res.json();
  metrics.recordPlacesCall();
  if (data.status !== 'OK') return [];
  const list = data.predictions || [];
  return list.map((p) => ({
    place_id: p.place_id,
    description: p.description || '',
  }));
}

/**
 * @param {string} placeId
 * @param {string} [sessionToken]
 * @returns {Promise<{ address_components?: Array, formatted_address?: string, geometry?: { location: { lat: number, lng: number } } } | null>}
 */
export async function getDetails(placeId, sessionToken) {
  const url = `${getPlacesBase()}/details`;
  const body = { placeId, fields: 'address_components,formatted_address,geometry' };
  if (sessionToken) body.sessionToken = sessionToken;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places details: ${res.status}`);
  const data = await res.json();
  metrics.recordPlacesCall();
  if (data.status !== 'OK' || !data.result) return null;
  return data.result;
}

/**
 * @param {string} address
 * @returns {Promise<{ address_components?: Array, formatted_address?: string, geometry?: { location: { lat: () => number, lng: () => number } } } | null>}
 */
export async function geocode(address) {
  const url = `${getPlacesBase()}/geocode`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: String(address || '').trim() }),
  });
  if (!res.ok) throw new Error(`Places geocode: ${res.status}`);
  const data = await res.json();
  metrics.recordPlacesCall();
  if (data.status !== 'OK' || !data.results?.length) return null;
  return data.results[0];
}
