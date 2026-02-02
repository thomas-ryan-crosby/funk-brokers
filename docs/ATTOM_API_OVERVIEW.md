# ATTOM API Overview

## Summary
The ATTOM integration is implemented as Cloud Functions that convert map viewport or address/location inputs into ATTOM API calls, normalize responses into a simplified parcel/snapshot format, and **cache results in Firestore and in-memory** to reduce API usage.

## Where It Lives
- Backend: `functions/attomService.js` (logic), `functions/index.js` (HTTP endpoints)
- Frontend service: `src/services/parcelService.js`
- Frontend normalizer (Property Detail snapshot → sections): `src/utils/attomSnapshotNormalizer.js`
- Consumers: `src/components/PropertyMap.jsx`, `src/components/CompsMap.jsx`, `src/pages/Home.jsx`, `src/pages/PropertyDetail.jsx`, `src/pages/GetVerified.jsx`, `src/pages/PreListingChecklist.jsx`, and any code that resolves address to parcel or fetches property snapshot
- Docs: `docs/ATTOM_SETUP.md`

## HTTP Endpoints (Cloud Functions)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getMapParcels` | GET/POST | Parcels in viewport for map layer. Query/body: `n`, `s`, `e`, `w`, `zoom`. Returns `{ parcels, tileKey, cache }`. |
| `resolveAddress` | POST | Resolve address to ATTOM parcel/attomId. Body: `{ address, n, s, e, w }`. Returns `{ attomId, parcel, ... }` or `{ attomId: null, parcel: null }`. |
| `getPropertySnapshot` | GET | Full ATTOM snapshot by attomId. Query: `attomId`, `lat`, `lng`. Returns cached or fresh snapshot payload for Property Detail / enrichment. |

Note: The PRD previously referred to `getParcelsInViewport`; the actual exported function name is `getMapParcels`.

## Request Flow (Map)
1. Frontend calls `getMapParcels({ bounds, zoom })` (from `parcelService.js`) when the map is idle at zoom >= 18.
2. The Cloud Function receives `n`, `s`, `e`, `w`, `zoom`, computes a tile key and center+radius, checks rate limit and cache.
3. On cache hit (Firestore `map_search_snapshot` or in-memory): returns cached parcels without calling ATTOM.
4. On cache miss: calls ATTOM allevents/snapshot, normalizes to lightweight parcels, writes cache, returns `{ parcels, tileKey, cache }`.

## Request Flow (Address Resolution)
1. Frontend calls `resolveAddressToParcel({ address, bounds })`.
2. Function normalizes address to a key, checks `address_attom_map` (and in-memory) cache.
3. On miss: calls ATTOM snapshot with bounds, resolves match, caches in `address_attom_map` and `property_snapshots`, returns attomId and parcel.

## Request Flow (Property Snapshot)
1. Frontend calls `getPropertySnapshot({ attomId, latitude, longitude })` for Property Detail or enrichment.
2. Function checks `property_snapshots` (and in-memory) by attomId.
3. On hit and not expired: returns cached payload.
4. On miss or expired: fetches from ATTOM (using lat/lng hint), caches full snapshot in Firestore, returns payload. Stale entries may be returned while revalidation runs in background.

## ATTOM Endpoint
```
https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot
```
- Parameters: `latitude`, `longitude`, `radius` (miles; clamped 0.25–20). Header: `APIKey`, `Accept: application/json`.
- Do **not** send `radiusunit`; ATTOM expects miles and rejects it.

## Caching (Current Implementation)
Caching **is** implemented to save ATTOM API calls:

| Cache | Collection / Store | TTL | Purpose |
|-------|--------------------|-----|---------|
| Map tiles | Firestore `map_search_snapshot` + in-memory | 30 min | Viewport parcel list per tile key (zoom:x:y). |
| Address → parcel | Firestore `address_attom_map` + in-memory | 120 days | Resolve address to attomId/parcel. |
| Full snapshot | Firestore `property_snapshots` + in-memory | 30 days (default); section-level TTLs for valuation, equity, distress (3d), tax/physical (90d), etc. | Full ATTOM payload per attomId for Property Detail and reuse. |

- **Singleflight:** Concurrent requests for the same tile/address/attomId share one ATTOM request.
- **Rate limiting:** Map requests are limited per requester per tile (e.g. 600 ms between calls per tile).
- **Firestore impact:** Every cache write and read uses Firestore (document writes, reads, and stored size). The `property_snapshots` collection stores the full ATTOM response per document and can become large. This reduces ATTOM API usage but increases Firestore usage (reads, writes, and storage).

## Data Requested / Normalized Output
- **Map parcels:** Lightweight list: `address`, `latitude`, `longitude`, `attomId`, `beds`, `baths`, `squareFeet`, `propertyType`, etc. (no AVM/sale in tile cache).
- **Address resolution:** Same plus `estimate`, `lastSalePrice`, `lastSaleDate` where available.
- **Full snapshot:** Raw ATTOM payload cached; frontend uses `attomSnapshotNormalizer.js` to produce sections (physical, ownership, valuation, tax, mortgage, sales, distress, etc.) for Property Detail UI.

## Rate-Control and Safeguards
- Map requests only when zoom >= 18 and on map `idle`.
- Radius clamped to 0.25–20 miles.
- Per-tile rate limit; singleflight; TTLs prevent unbounded cache growth but do not limit total Firestore size by themselves.

---
For setup (API key, deploy), see `docs/ATTOM_SETUP.md`.
