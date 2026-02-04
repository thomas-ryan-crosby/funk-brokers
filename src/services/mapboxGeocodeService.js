/**
 * Mapbox Geocoding (replaces Google Places for address/geocode).
 * Uses /api/mapbox/geocode so token stays server-side.
 */

function getApiBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/mapbox`;
}

/**
 * Mapbox feature -> { address, city, state, zipCode, latitude, longitude }.
 * place_name is full string; context has place, region, postcode.
 */
export function mapboxFeatureToAddress(feature) {
  if (!feature) return null;
  const [lng, lat] = feature.center || [];
  const placeName = feature.place_name || '';
  const context = feature.context || [];
  let address = feature.address ? `${feature.address} ${feature.text || ''}`.trim() : (feature.text || '');
  let city = '';
  let state = '';
  let zipCode = '';
  for (const c of context) {
    const id = (c.id || '').toString();
    if (id.startsWith('place.')) city = c.text || city;
    if (id.startsWith('region.')) state = c.short_code?.replace(/^US-/, '') || c.text || state;
    if (id.startsWith('postcode.')) zipCode = c.text || zipCode;
  }
  if (!address && placeName) address = placeName;
  return {
    address: address || placeName,
    city,
    state,
    zipCode,
    latitude: typeof lat === 'number' ? lat : undefined,
    longitude: typeof lng === 'number' ? lng : undefined,
    place_name: placeName,
  };
}

/**
 * Forward geocode (autocomplete). Returns list of suggestions.
 * @param {string} input
 * @param {string} [types] - e.g. 'address,place' (default) or 'place,region' for city/state
 * @returns {Promise<Array<{ id: string, description: string, place_name: string, center: [number, number], city?, state? }>>}
 */
export async function getPredictions(input, types = 'address,place') {
  const q = String(input || '').trim();
  if (!q) return [];
  const base = getApiBase();
  const params = new URLSearchParams({ q, limit: '5', types, country: 'US' });
  const res = await fetch(`${base}/geocode?${params.toString()}`);
  if (!res.ok) throw new Error(`Mapbox geocode: ${res.status}`);
  const data = await res.json();
  const features = data.features || [];
  return features.map((f) => {
    let city = '';
    let state = '';
    for (const c of f.context || []) {
      const id = (c.id || '').toString();
      if (id.startsWith('place.')) city = c.text || city;
      if (id.startsWith('region.')) state = c.short_code?.replace(/^US-/, '') || c.text || state;
    }
    return {
      id: f.id,
      description: f.place_name || '',
      place_name: f.place_name || '',
      center: Array.isArray(f.center) ? f.center : [0, 0],
      city,
      state,
    };
  });
}

/**
 * Forward geocode single address -> coords + place_name (for Home unlisted, etc.).
 * @param {string} address
 * @returns {Promise<{ place_name: string, center: [number, number], address, city, state, zipCode } | null>}
 */
export async function geocode(address) {
  const q = String(address || '').trim();
  if (!q) return null;
  const base = getApiBase();
  const params = new URLSearchParams({ q, limit: '1', types: 'address,place', country: 'US' });
  const res = await fetch(`${base}/geocode?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  return mapboxFeatureToAddress(feature);
}
