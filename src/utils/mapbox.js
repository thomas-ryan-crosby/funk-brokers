/**
 * Mapbox token for GL JS (maps). Use in browser only.
 * For server-side geocoding, use MAPBOX_ACCESS_TOKEN in api/mapbox/*.
 */
export const MAPBOX_ACCESS_TOKEN =
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '' : '';

export function hasMapboxToken() {
  return Boolean(MAPBOX_ACCESS_TOKEN);
}
