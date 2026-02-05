/**
 * Feature flags. Set via env (e.g. VITE_USE_MAP_DEBOUNCE=true).
 * Firebase/Postgres flags removed; app uses Postgres and upload API only.
 */

const asBool = (v) => v === true || v === 'true' || v === '1';

export const USE_ATTOM_CACHE = asBool(import.meta.env.VITE_USE_ATTOM_CACHE);
export const USE_MAP_DEBOUNCE = asBool(import.meta.env.VITE_USE_MAP_DEBOUNCE);
export const USE_SEARCH_INDEX = asBool(import.meta.env.VITE_USE_SEARCH_INDEX);
export const USE_OBJECT_STORAGE_PROXY = asBool(import.meta.env.VITE_USE_OBJECT_STORAGE_PROXY);
export const ENABLE_MAP_QUERY_DEBOUNCE = import.meta.env.VITE_ENABLE_MAP_QUERY_DEBOUNCE !== 'false';
export const ENABLE_CLIENT_CACHE = import.meta.env.VITE_ENABLE_CLIENT_CACHE !== 'false';
export const ENABLE_QUERY_DEDUPE = import.meta.env.VITE_ENABLE_QUERY_DEDUPE !== 'false';
export const ENABLE_SAFE_LIMITS = import.meta.env.VITE_ENABLE_SAFE_LIMITS !== 'false';

export default {
  USE_ATTOM_CACHE,
  USE_MAP_DEBOUNCE,
  USE_SEARCH_INDEX,
  USE_OBJECT_STORAGE_PROXY,
  ENABLE_MAP_QUERY_DEBOUNCE,
  ENABLE_CLIENT_CACHE,
  ENABLE_QUERY_DEDUPE,
  ENABLE_SAFE_LIMITS,
};
