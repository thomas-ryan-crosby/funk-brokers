/**
 * Feature flags for cost-architecture refactor.
 * All flags default to OFF (false) unless noted. Set via env (e.g. VITE_USE_MAP_DEBOUNCE=true).
 * Used to gate new behavior; existing flows remain intact until explicitly enabled.
 */

const asBool = (v) => v === true || v === 'true' || v === '1';

export const USE_SERVER_DATA_LAYER = asBool(import.meta.env.VITE_USE_SERVER_DATA_LAYER);
export const USE_ATTOM_CACHE = asBool(import.meta.env.VITE_USE_ATTOM_CACHE);
export const USE_MAP_DEBOUNCE = asBool(import.meta.env.VITE_USE_MAP_DEBOUNCE);
export const USE_SEARCH_INDEX = asBool(import.meta.env.VITE_USE_SEARCH_INDEX);
export const USE_OBJECT_STORAGE_PROXY = asBool(import.meta.env.VITE_USE_OBJECT_STORAGE_PROXY);
export const USE_SOCIAL_READS = asBool(import.meta.env.VITE_USE_SOCIAL_READS);

/** Emergency read-reduction flags (default ON for safety). Set false to roll back. */
export const USE_FIRESTORE_REALTIME = asBool(import.meta.env.VITE_USE_FIRESTORE_REALTIME); // false = one-time only (no onSnapshot in codebase)
export const ENABLE_MAP_QUERY_DEBOUNCE = import.meta.env.VITE_ENABLE_MAP_QUERY_DEBOUNCE !== 'false';
export const ENABLE_CLIENT_CACHE = import.meta.env.VITE_ENABLE_CLIENT_CACHE !== 'false';
export const ENABLE_QUERY_DEDUPE = import.meta.env.VITE_ENABLE_QUERY_DEDUPE !== 'false';
export const ENABLE_SAFE_LIMITS = import.meta.env.VITE_ENABLE_SAFE_LIMITS !== 'false';
/** When true: properties browse returns cached/empty; map pins return cached only. */
export const FIRESTORE_READ_KILL_SWITCH = asBool(import.meta.env.VITE_FIRESTORE_READ_KILL_SWITCH);

export default {
  USE_SERVER_DATA_LAYER,
  USE_ATTOM_CACHE,
  USE_MAP_DEBOUNCE,
  USE_SEARCH_INDEX,
  USE_OBJECT_STORAGE_PROXY,
  USE_SOCIAL_READS,
  USE_FIRESTORE_REALTIME,
  ENABLE_MAP_QUERY_DEBOUNCE,
  ENABLE_CLIENT_CACHE,
  ENABLE_QUERY_DEDUPE,
  ENABLE_SAFE_LIMITS,
  FIRESTORE_READ_KILL_SWITCH,
};
