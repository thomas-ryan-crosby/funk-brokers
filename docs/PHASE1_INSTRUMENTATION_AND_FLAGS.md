# Phase 1 — Instrumentation & Feature Flags

**Branch:** `dev/cost-architecture-refactor`

## 1) Server-side instrumentation (Cloud Functions)

- **Firestore reads/writes per route:** Each ATTOM endpoint (`getMapParcels`, `resolveAddress`, `getPropertySnapshot`) accepts an optional `metrics` object. `functions/attomService.js` increments `firestoreReads` on every `getCachedDoc` and `firestoreWrites` on every `setCachedDoc`. `functions/index.js` creates `metrics`, passes it into the attomService calls, and logs a JSON line after each request: `{ route, latencyMs, firestoreReads, firestoreWrites, attomCalls }`.
- **ATTOM calls per route:** `attomCalls` is incremented in attomService when the upstream ATTOM API is called (cache miss).
- **Latency:** `index.js` records `Date.now()` before and after each handler and logs `latencyMs`.

**Where to see logs:** Firebase Console → Functions → Logs, or `firebase functions:log`. Filter for JSON lines containing `route`, `latencyMs`, `firestoreReads`, `firestoreWrites`, `attomCalls`.

## 2) Client-side metrics (`src/utils/metrics.js`)

- **In-memory only;** no network. Use `metrics.getSummary()` or `metrics.logSummary()` for debugging.
- **Recorded:**
  - **ATTOM proxy:** `parcelService` records each `getMapParcels` / `resolveAddress` / `getPropertySnapshot` call and latency (map pins latency used for p95).
  - **Places:** `AddressAutocomplete` and `Feed` call `metrics.recordPlacesCall()` on Geocoder/PlacesService usage.
  - **Storage:** `storageService` records upload bytes and count on `uploadFile` and `uploadBytesResumable` completion.
  - **Latency:** `recordLatency(operation, ms)` for `mapPins`, `propertyDetail`, `feed`. `PropertyDetail` records when property (and snapshot if attomId) load completes; `Feed` records when `loadFeedData` completes.
- **p95:** `metrics.getP95('mapPins' | 'propertyDetail' | 'feed')` and `getSummary().p95Ms`.
- **Reset:** `metrics.reset()` clears all counters and latency samples.

## 3) Feature flags (env-based, default OFF)

**File:** `src/config/featureFlags.js`

| Flag | Env variable | Purpose (when implemented) |
|------|----------------|---------------------------|
| USE_SERVER_DATA_LAYER | VITE_USE_SERVER_DATA_LAYER | Gate server-side data access layer |
| USE_ATTOM_CACHE | VITE_USE_ATTOM_CACHE | Gate ATTOM cache behavior (e.g. alternate cache) |
| USE_MAP_DEBOUNCE | VITE_USE_MAP_DEBOUNCE | Gate stronger map debounce/throttle |
| USE_SEARCH_INDEX | VITE_USE_SEARCH_INDEX | Gate search index (e.g. Algolia/Meilisearch) |
| USE_OBJECT_STORAGE_PROXY | VITE_USE_OBJECT_STORAGE_PROXY | Gate media proxy / R2 |

**Default:** All are `false` unless set to a truthy value (`true`, `'true'`, `'1'`).

**Usage:** In app code, import and branch:

```js
import { USE_MAP_DEBOUNCE } from '../config/featureFlags';
if (USE_MAP_DEBOUNCE) {
  // new debounce logic
} else {
  // existing logic
}
```

**Example `.env` (optional):**

```bash
# Feature flags (Phase 2+); leave unset or false for current behavior
# VITE_USE_SERVER_DATA_LAYER=false
# VITE_USE_MAP_DEBOUNCE=false
# VITE_USE_ATTOM_CACHE=false
# VITE_USE_SEARCH_INDEX=false
# VITE_USE_OBJECT_STORAGE_PROXY=false
```

## 4) Files touched

| Area | Files |
|------|--------|
| Feature flags | `src/config/featureFlags.js` (new) |
| Client metrics | `src/utils/metrics.js` (new) |
| Parcel/ATTOM client | `src/services/parcelService.js` (timing + metrics.recordAttomCall) |
| Storage | `src/services/storageService.js` (metrics.recordStorageUpload) |
| Property detail | `src/pages/PropertyDetail.jsx` (propertyDetailStartRef + recordLatency) |
| Feed | `src/pages/Feed.jsx` (loadFeedData timing + recordLatency, recordPlacesCall) |
| Places | `src/components/AddressAutocomplete.jsx` (recordPlacesCall) |
| Functions | `functions/attomService.js` (optional metrics param, _metrics, getCachedDoc/setCachedDoc + attomCalls), `functions/index.js` (metrics + latency log per route) |

Existing behavior is unchanged; instrumentation is additive. Feature flags are read but not yet used to change behavior (Phase 2+).
