/**
 * In-memory TTL cache for Firestore efficiency (Tier 2).
 * Used by parcelService, propertyService, feedbackService.
 */

const store = new Map();
const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 min

/**
 * @param {string} key
 * @param {number} [ttlMs]
 * @returns {unknown | undefined} Cached value or undefined if missing/expired
 */
export function get(key, ttlMs = DEFAULT_TTL_MS) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} [ttlMs]
 */
export function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Remove a single key (e.g. to invalidate after write).
 * @param {string} key
 */
export function remove(key) {
  store.delete(key);
}

/**
 * Clear all cached entries (e.g. on logout if needed).
 */
export function clear() {
  store.clear();
}
