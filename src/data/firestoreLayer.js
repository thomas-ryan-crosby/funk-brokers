/**
 * Centralized data layer for hot Firestore-backed paths.
 * Applies kill switch, cache, and dedupe in one place.
 * Callers can use this module for: map pins, properties browse, property detail, feed.
 */

import { getAllProperties, searchProperties, getPropertyById } from '../services/propertyService';
import { getMapParcels } from '../services/parcelService';
import { get as cacheGet, set as cacheSet } from '../utils/ttlCache';
import { ENABLE_CLIENT_CACHE, ENABLE_QUERY_DEDUPE } from '../config/featureFlags';

const PROPERTY_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const propertyDetailInFlight = new Map();

/**
 * Properties for browse (Home list, Feed address match).
 * Delegates to getAllProperties or searchProperties; kill switch is applied inside those.
 */
export async function fetchPropertiesForBrowse(filters = {}) {
  if (Object.keys(filters).length === 0) {
    return getAllProperties();
  }
  return searchProperties(filters);
}

/**
 * Single property by ID. In-flight dedupe when ENABLE_QUERY_DEDUPE; short TTL cache when ENABLE_CLIENT_CACHE.
 */
export async function fetchPropertyDetail(propertyId) {
  if (!propertyId) return null;
  const cacheKey = `property_detail_${propertyId}`;
  if (ENABLE_CLIENT_CACHE) {
    const cached = cacheGet(cacheKey, PROPERTY_DETAIL_CACHE_TTL_MS);
    if (cached != null) return cached;
  }
  if (ENABLE_QUERY_DEDUPE) {
    const existing = propertyDetailInFlight.get(propertyId);
    if (existing) return existing;
  }
  const promise = getPropertyById(propertyId).then((data) => {
    if (ENABLE_CLIENT_CACHE && data) cacheSet(cacheKey, data, PROPERTY_DETAIL_CACHE_TTL_MS);
    return data;
  });
  if (ENABLE_QUERY_DEDUPE) {
    propertyDetailInFlight.set(propertyId, promise);
    promise.finally(() => propertyDetailInFlight.delete(propertyId));
  }
  return promise;
}

/**
 * Map pins (unlisted parcels). Delegates to parcelService (already has cache, dedupe, kill switch).
 */
export async function fetchMapPins({ bounds, zoom }) {
  return getMapParcels({ bounds, zoom });
}
