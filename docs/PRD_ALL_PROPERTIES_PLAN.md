# Plan: All-Properties Layer (Zillow-like “Unlisted” + Estimate + Last Sale)

**Version:** 1.0  
**Date:** January 2025  
**Status:** Planning

---

## 1. Overview

### 1.1 Goal

Extend Funk Brokers so that **all properties** (not just user-listed ones) appear on the map and in browse. When a user hovers over any property, they see:

- **Listed vs. Unlisted** – whether it’s for sale on the platform
- **Estimated value** (“Funk Estimate”) – similar to Zillow’s Zestimate
- **Last sale** – date and price when available

This creates a Zillow-like baseline: every address is visible and has context, while **listed** properties are clearly highlighted and link to full detail, offers, and transactions.

### 1.2 Why

- **Discovery:** Buyers can explore any area and see values and history even when nothing is listed.
- **Conversion:** “Interested in this unlisted property?” can drive lead capture and future listings.
- **Trust:** Transparent estimates and last-sale data support pricing and offer decisions.
- **Differentiation:** Combines FSBO marketplace with broad, assessor-style coverage.

---

## 2. Current State

| Aspect | Today |
|--------|--------|
| **Property source** | Firestore `properties` only (user-created listings) |
| **Map** | `PropertyMap.jsx` – Google Maps, markers for listed properties with `latitude`/`longitude` |
| **Hover/click** | InfoWindow on **click**: address, price, “View details” |
| **Data** | Address, price, beds, baths, sqft, photos, docs, etc. |
| **Browse** | List + map of listed properties only |

---

## 3. Target Experience

### 3.1 Map

- **All properties in viewport** appear as points (or parcel outlines in a later phase).
- **Listed** properties: distinct marker (e.g. pin, “For Sale” badge) and remain clickable to full PropertyDetail.
- **Unlisted** properties: neutral marker (e.g. dot or house icon).

### 3.2 Hover (tooltip / mini-card)

**Listed**

- Address, **Listed**, asking price, beds/baths, “View details.”

**Unlisted**

- Address  
- **Unlisted**  
- **Funk Estimate:** $XXX,XXX (or “—”)  
- **Last sale:** e.g. “Jan 2022 · $450,000” (or “—”)  
- Optional: beds, baths, sqft when we have them  
- Optional CTA: “I’m interested” / “Notify when listed” (later phase)

### 3.3 Click

- **Listed:** existing behavior (navigate to `/property/:id`).
- **Unlisted:**  
  - **Phase 1:** optional sidebar/drawer with same info as tooltip + “I’m interested” (lead capture).  
  - **Phase 2+:** “Request info” or “Make an offer” for off-market (product/legal scope TBD).

---

## 4. Data Strategy

### 4.1 What We Need per Property (Unlisted)

| Field | Description | Source |
|-------|-------------|--------|
| `address` | Street, city, state, zip | Parcel / assessor / API |
| `latitude`, `longitude` | For map | Geocoding / parcel centroid |
| `parcelId` / `apn` | Parcel or APN | Assessor / data provider |
| `estimate` | AVM (Funk Estimate) | AVM API |
| `lastSaleDate` | Deed/sale date | Deed / sales history API |
| `lastSalePrice` | Deed/sale price | Deed / sales history API |
| `bedrooms`, `bathrooms`, `squareFeet` | When available | Assessor / API |

### 4.2 Data Source Options

| Provider | Data | AVM | Last sale | Notes |
|----------|------|-----|-----------|--------|
| **ATTOM** | 158M+ U.S. properties, address, parcel, deed, sales | ATTOM AVM | Yes (deed/sale history) | REST API; free trial; enterprise pricing |
| **HouseCanary** | 136M+ properties, 114M+ AVMs | Yes (high accuracy) | Via property/record | Data Explorer API; $190–$1,990/yr |
| **Regrid** | Parcel polygons, some attributes | No | Varies by county | Good for parcel boundaries; less for AVM/sale |
| **County assessors** | Varies | Sometimes | Sometimes | Free but fragmented; ETL per county |
| **Mock / seed** | N/A | N/A | N/A | For MVP before paid API |

**Recommendation for MVP:** Start with **ATTOM** or **HouseCanary** (or both in parallel for comparison) for a bounded geography. Use **mock data** for a “Phase 0” to validate UX and architecture before contract/payment.

---

## 5. Architecture Options

### 5.1 Option A: On-Demand API (No Bulk Storage)

- On **viewport change** or **hover**, call external API (by bbox, address, or parcel ID).
- **Pros:** No bulk ETL, always fresh, small storage.  
- **Cons:** Latency, rate limits, cost per request, dependency on provider uptime.

### 5.2 Option B: Bulk Import + Firestore (or Other DB)

- ETL: periodic import of parcels + AVM + last sale for target counties into Firestore (or Postgres/Supabase for heavy geo).
- **Pros:** Fast reads, predictable cost, works offline-ish.  
- **Cons:** Storage, ETL pipeline, refresh lag, need geo queries (e.g. geohash).

### 5.3 Option C: Hybrid (Cache by Viewport / Tile)

- First time a **viewport** (or tile) is requested: call provider, cache in Firestore (e.g. `parcelCache/{geohash}` or `tileCache/{zoom}_{x}_{y}`) with TTL.
- Subsequent hovers/views in same area: read from cache; refresh in background when stale.
- **Pros:** Good balance of freshness, cost, and latency.  
- **Cons:** More logic (cache key, TTL, invalidation).

**Recommendation:** **Option C (Hybrid)** for production. For **Phase 0 / MVP**, **Option A** is acceptable if we:
- Call the API only on **hover** (or on a grid of points in the viewport) to limit volume,
- Optionally cache responses in **memory or Firestore** with a short TTL to avoid duplicate calls for the same parcel.

---

## 6. Technical Approach

### 6.1 Backend / API Shape

- **Listed properties:** unchanged; read from Firestore `properties`.
- **Unlisted properties:**  
  - **Phase 0:** Mock service returning fake `estimate`, `lastSaleDate`, `lastSalePrice` for (lat, lng) or address.  
  - **Phase 1:**  
    - **Cloud Function** (or small Node service) that:  
      - Accepts `bbox` (or `lat`, `lng`, `radius`) or `address`.  
      - Calls ATTOM/HouseCanary (or cache).  
      - Returns `{ parcels: [ { address, lat, lng, parcelId, estimate, lastSaleDate, lastSalePrice, beds, baths, sqft } ] }`.  
    - **Caching:** Firestore collection `parcelCache` keyed by `geohash` (e.g. precision 7) or by `bbox` with TTL (e.g. 7 days).  

- **Unified “all properties” in viewport:**  
  - Client (or Cloud Function) merges:  
    - Listed: from `getAllProperties` / `searchProperties` filtered by viewport.  
    - Unlisted: from parcel/API (or cache).  
  - Deduplication: if a listed property’s (lat, lng) or address matches a parcel, show **listed** only (or clearly prioritize it).

### 6.2 Data Model (Unlisted / Parcel)

We need a representation for “unlisted” that does not live in `properties` (which implies `sellerId` and listing metadata). Options:

- **A. No persistent storage (on-demand only):**  
  - DTO returned by API/Cloud Function:  
    `{ id?: string, address, latitude, longitude, parcelId?, estimate?, lastSaleDate?, lastSalePrice?, bedrooms?, bathrooms?, squareFeet?, source: 'api' | 'cache', isListed: false }`

- **B. Firestore `parcels` (or `propertyBase`) for cache/hybrid:**  
  - Doc ID: `parcelId` or `geohash_address`  
  - Fields: `address`, `latitude`, `longitude`, `estimate`, `lastSaleDate`, `lastSalePrice`, `bedrooms`, `bathrooms`, `squareFeet`, `cachedAt`  
  - Only used when we persist API results for the hybrid strategy.

For **MVP**, A is enough; B when we add hybrid caching.

### 6.3 Map and UI

- **PropertyMap:**  
  - **Inputs:**  
    - `listedProperties` (current `properties` with lat/lng).  
    - `unlistedParcels` (from new parcel/AVM API or mock).  
  - **Rendering:**  
    - Two marker layers (or two marker types): listed (e.g. pin) vs. unlisted (e.g. circle).  
    - **Hover:** one tooltip component that switches on `isListed`: listed shows price + “View details”; unlisted shows “Unlisted”, Funk Estimate, last sale.  
  - **Viewport:**  
    - On `idle`/`bounds_changed`:  
      - Listed: already obtained from `getAllProperties`/search; filter by bounds.  
      - Unlisted: call `getParcelsInViewport(bounds)` (Cloud Function or client→API).  

- **Home/Browse:**  
  - List view: we can either keep “listed only” or add an “Include unlisted” toggle that, in map mode, fetches and merges unlisted in view. List view for unlisted is optional (could be Phase 2).

- **Deduplication:**  
  - If `(lat, lng)` or normalized address matches a listed property, treat as **listed** only; do not show duplicate unlisted marker.

### 6.4 New Services / Modules

| Component | Role |
|-----------|------|
| `parcelService.js` (client) | `getParcelsInViewport(bounds)`, `getParcelByAddress(address)` → calls Cloud Function or external API |
| Cloud Function `getParcelsInViewport` | Input: bbox; outputs parcels from ATTOM/HouseCanary or cache |
| `mockParcelService.js` | Returns fake parcels for (lat, lng) or bbox for Phase 0 |
| `PropertyMap` (updated) | Two layers, tooltip for listed vs. unlisted, viewport→`getParcelsInViewport` |

### 6.5 Dependencies

- **Google Maps:** already in use; no change except more markers and tooltip content.
- **Firebase:** Firestore for cache (if hybrid); Cloud Functions for server-side API calls (to hide keys and respect rate limits).
- **External:** ATTOM or HouseCanary (key in Cloud Functions env; not exposed to client).

---

## 7. Phasing

### Phase 0: Mock + UX (No paid API)

- **Scope:**  
  - Mock `getParcelsInViewport(bounds)` that returns fake unlisted parcels (e.g. grid of points in bbox with deterministic “estimate” and “last sale”).  
  - `PropertyMap` shows both listed and “unlisted” (mock) markers; different icon for unlisted.  
  - Hover: tooltip with “Unlisted”, “Funk Estimate: $X”, “Last sale: …”.  
  - Click unlisted: optional drawer with same info + “I’m interested” (lead form; can store in Firestore `unlistedInterest` or similar).  

- **Outcome:** UX validated; map and tooltip behavior; no $ or external dependency.

### Phase 1: Real Data (One Provider, One Region)

- **Scope:**  
  - Integrate **ATTOM** or **HouseCanary** via Cloud Function.  
  - Restrict to one metro or a few counties to control volume and cost.  
  - Replace mock with real `getParcelsInViewport` (and optional `getParcelByAddress`).  
  - Add **caching** in Firestore for viewport/tile or geohash with TTL (e.g. 7 days).  
  - Same UI as Phase 0; only data is real.  

- **Outcome:** Real Zillow-like experience in a pilot region.

### Phase 2: Scale and Product

- **Scope:**  
  - Expand coverage (more counties/states).  
  - “I’m interested” / “Notify when listed” → email or in-app notifications when that address (or nearby) gets listed.  
  - List view: optional “Include unlisted” with simplified cards (address, estimate, last sale).  
  - Consider parcel polygons on map (Regrid or provider boundaries) if useful.  

### Phase 3 (Future)

- **Scope:**  
  - A/B test ATTOM vs. HouseCanary (or blend).  
  - Historical estimates, trends.  
  - “Request info” / “Make an offer” on unlisted (legal/compliance scope TBD).  

---

## 8. Open Decisions

1. **Provider:** ATTOM vs. HouseCanary vs. both (cost, coverage, and accuracy by region).  
2. **Caching key:** Geohash vs. bbox/tile; TTL.  
3. **“Funk Estimate” branding:** Name and disclaimers (e.g. “Estimate only; not an appraisal”).  
4. **Lead capture:** Fields for “I’m interested” (email, address, message?) and where to store.  
5. **Geography for Phase 1:** Which metro or counties to enable first.  
6. **List view:** Whether unlisted ever appears in the main list or only on the map.

---

## 9. PRD Addition (for main PRD)

The following can be pasted into `PRD.md` as a new subsection (e.g. under 5.2 Property Discovery or 10. Future Enhancements).

---

### 5.2.x All-Properties Map (Unlisted + Estimate + Last Sale) — *New*

**Priority:** P1 (High) / Post-MVP

**Summary:**  
Show **all properties** on the map (not only platform listings). Unlisted properties display an estimated value (“Funk Estimate”), last sale when available, and a clear “Unlisted” state. Listed properties remain emphasized and link to full detail and offers.

**Requirements:**

- **Map**  
  - All properties in the current viewport are shown as markers.  
  - Listed: distinct marker (e.g. “For Sale” pin); click → PropertyDetail.  
  - Unlisted: neutral marker; hover → tooltip; click → drawer/sidebar (Phase 1).  

- **Hover tooltip (unlisted)**  
  - Address.  
  - **Unlisted.**  
  - **Funk Estimate:** $XXX,XXX or “—”.  
  - **Last sale:** e.g. “Jan 2022 · $450,000” or “—”.  
  - Beds, baths, sqft when provided by the data source.  

- **Hover tooltip (listed)**  
  - Address, **Listed**, asking price, beds/baths, “View details.”  

- **Click (unlisted)**  
  - Sidebar/drawer with same info as tooltip.  
  - “I’m interested” / “Notify when listed” (lead capture).  

- **Data**  
  - Unlisted data from a property/AVM API (e.g. ATTOM, HouseCanary) via a backend (Cloud Function) to protect keys and manage rate limits.  
  - Caching of API responses (e.g. by viewport/tile or geohash) to reduce cost and latency.  

- **Deduplication**  
  - If a parcel matches a listed property (by coordinates or address), only the listed property is shown.  

**Acceptance Criteria:**

- [ ] Map shows both listed and unlisted properties in the viewport.  
- [ ] Unlisted tooltip shows: Unlisted, Funk Estimate, last sale (when available).  
- [ ] Listed tooltip shows: List price, “View details.”  
- [ ] Unlisted click opens a drawer with “I’m interested” (or equivalent).  
- [ ] Unlisted data is loaded via a backend (no provider API keys in the client).  
- [ ] Estimates and last-sale data are clearly labeled as informative, not appraisals.

**Phasing:**  
- Phase 0: Mock data + full UX.  
- Phase 1: Real API (one provider, one region) + caching.  
- Phase 2: Broader coverage, “Notify when listed,” optional list view for unlisted.

---

## 10. Appendix: Provider Notes

### ATTOM

- **Property Data API:** address, APN, lat/lng, ownership, characteristics, sales.  
- **ATTOM AVM:** separate product.  
- **Formats:** REST, JSON/XML.  
- **Lookup:** address, APN, ATTOM ID, or coordinates.  
- **Pricing:** custom; free trial.

### HouseCanary

- **Data Explorer:** 75+ points (property, block, ZIP, MSA, state).  
- **AVM:** 114M+; ~3.1% median error.  
- **Pricing:** from $190/yr (Basic) to $1,990/yr (Teams); API on Pro+.

### Regrid

- **Parcel fabric:** polygons, parcel IDs, some attributes.  
- **Use case:** parcel boundaries on map; less for AVM/last sale.  
- **Pricing:** subscription by region.

---

---

## 11. Implementation Checklist (Phase 0 → Phase 1)

Use this to break work into tickets.

### Phase 0 (Mock)

- [ ] **Data**
  - [ ] `src/services/mockParcelService.js`: `getParcelsInViewport(bounds)` returning fake `{ address, latitude, longitude, estimate, lastSaleDate, lastSalePrice }` (e.g. grid in bbox).
  - [ ] (Optional) `getParcelByAddress(address)` for future drawer.
- [ ] **Map**
  - [ ] `PropertyMap`: accept `unlistedParcels` (or fetch via `getParcelsInViewport` on bounds).
  - [ ] Two marker styles: listed (pin) vs. unlisted (dot/circle).
  - [ ] Tooltip on **hover** (not only click): branch on listed vs. unlisted; show Unlisted, Funk Estimate, last sale for unlisted.
  - [ ] Deduplication: if (lat, lng) matches a listed property, do not show unlisted marker.
- [ ] **Home**
  - [ ] On map `idle`/`bounds_changed`: call `getParcelsInViewport(map.getBounds())`; merge with listed; pass to `PropertyMap`.
- [ ] **Unlisted click**
  - [ ] Drawer/sidebar: address, Unlisted, estimate, last sale; “I’m interested” form (email, optional message).
  - [ ] Firestore `unlistedInterest` or equivalent; or in-app only for now.

### Phase 1 (Real API)

- [ ] **Backend**
  - [ ] Cloud Function `getParcelsInViewport`: in params `bbox` or `{n,s,e,w}`; call ATTOM or HouseCanary; return `{ parcels }`.
  - [ ] Env: `ATTOM_API_KEY` or `HOUSECANARY_API_KEY` (never to client).
  - [ ] Optional: Firestore `parcelCache` keyed by `geohash` or bbox; TTL 7 days; read-through.
- [ ] **Client**
  - [ ] `parcelService.js`: `getParcelsInViewport(bounds)` → call Cloud Function (replace mock).
  - [ ] Restrict to one metro/county in the Cloud Function (config or env).
- [ ] **Legal / UX**
  - [ ] Disclaimers: “Funk Estimate is an estimate only, not an appraisal.”
  - [ ] “Last sale” sourced from public records; “— when not available.”

---

**Document owner:** Product  
**Stakeholders:** Engineering, Design  
**Next step:** Choose Phase 0 vs. Phase 1 start, pick provider for Phase 1, and add the PRD subsection to the main PRD.
