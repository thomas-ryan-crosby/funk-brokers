/**
 * Feature flags for cost-architecture refactor.
 * All flags default to OFF (false). Set via env (e.g. VITE_USE_MAP_DEBOUNCE=true).
 * Used to gate new behavior; existing flows remain intact until explicitly enabled.
 */

const asBool = (v) => v === true || v === 'true' || v === '1';

export const USE_SERVER_DATA_LAYER = asBool(import.meta.env.VITE_USE_SERVER_DATA_LAYER);
export const USE_ATTOM_CACHE = asBool(import.meta.env.VITE_USE_ATTOM_CACHE);
export const USE_MAP_DEBOUNCE = asBool(import.meta.env.VITE_USE_MAP_DEBOUNCE);
export const USE_SEARCH_INDEX = asBool(import.meta.env.VITE_USE_SEARCH_INDEX);
export const USE_OBJECT_STORAGE_PROXY = asBool(import.meta.env.VITE_USE_OBJECT_STORAGE_PROXY);
export const USE_SOCIAL_READS = asBool(import.meta.env.VITE_USE_SOCIAL_READS);

export default {
  USE_SERVER_DATA_LAYER,
  USE_ATTOM_CACHE,
  USE_MAP_DEBOUNCE,
  USE_SEARCH_INDEX,
  USE_OBJECT_STORAGE_PROXY,
  USE_SOCIAL_READS,
};
