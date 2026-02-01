# ATTOM API Overview

## Summary
The ATTOM integration is implemented as a Cloud Function that converts a map viewport into a
center + radius query, calls the ATTOM "all events snapshot" endpoint, and normalizes the
response into a simplified parcel format for the frontend.

There is **no caching** in place today. Every eligible map idle event triggers a fresh API
request.

## Where It Lives
- Backend: `functions/index.js`
- Frontend service: `src/services/parcelService.js`
- Consumers:
  - `src/components/PropertyMap.jsx`
  - `src/components/CompsMap.jsx`
  - `src/pages/Home.jsx`
- Docs: `docs/ATTOM_SETUP.md`

## Request Flow
1. Frontend calls `getParcelsInViewport(bounds)` when the map is idle at zoom >= 18.
2. The Cloud Function parses the viewport bounds, computes center + radius (miles), and calls ATTOM.
3. The response is normalized into a parcel array and returned as `{ parcels: [...] }`.

## ATTOM Endpoint
```
https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot
```

### Parameters
- `latitude` (number) — center latitude in degrees
- `longitude` (number) — center longitude in degrees
- `radius` (number) — radius in miles (clamped to 0.25–20)
- Header: `APIKey: <ATTOM_API_KEY>`

Note: `radiusunit` is not sent; ATTOM expects miles by default and rejects the parameter.

## Data Requested / Normalized Output
Fields mapped into the parcel object (with fallback paths):
- `address` (line1, line2, locality, adminarea, postal1)
- `latitude`, `longitude`
- `estimate` (AVM)
- `lastSalePrice`, `lastSaleDate`
- `attomId`
- `beds`, `baths`, `squareFeet`

## Caching Status
There is **no caching** implemented in:
- Cloud Function (no in-memory cache)
- Firestore (no cache collection)
- Frontend (no memoization beyond normal state updates)

Docs mention potential caching (e.g., a Firestore `parcelCache`), but it is not implemented.

## Rate-Control Behaviors (Current)
While there is no caching, a few safeguards reduce calls:
- Requests only fire when zoom >= 18.
- Calls run on map `idle` events (not on every pan/drag).
- Radius is clamped to 0.25–20 miles to bound results.

---
If you want caching added (e.g., tile/geohash-based Firestore caching or Cloud Function memory
cache), we can implement it next.
