# Cost Architecture Refactor — Detailed Implementation Plan

**Branch:** `dev/cost-architecture-refactor`  
**Reference:** Phase 0 (review), Phase 1 (instrumentation/flags), Phase 3 (target architecture).

---

## Overview

Work is split into **waves** that can be shipped independently. Each wave is gated by feature flags where applicable; flags default OFF so production stays unchanged until enabled.

| Wave | Focus | New infra? | Flag(s) |
|------|--------|------------|---------|
| **Wave 1** | No-regrets Firestore limits, Places session token, map debounce, client dedupe | No | USE_MAP_DEBOUNCE |
| **Wave 2** | Vercel API + Redis for ATTOM cache | Yes (Upstash, Vercel API) | USE_ATTOM_CACHE (or new USE_VERCEL_ATTOM) |
| **Wave 3** | DAL: client calls API only for ATTOM/Places | No (uses Wave 2 API) | USE_SERVER_DATA_LAYER |
| **Wave 4** | Postgres (one domain: social) | Yes (Neon) | USE_SERVER_DATA_LAYER + backend switch |
| **Wave 5** | Meilisearch for map pins | Yes (Meilisearch) | USE_SEARCH_INDEX |
| **Wave 6** | R2 proxy for media | Yes (R2, Vercel API) | USE_OBJECT_STORAGE_PROXY |

---

## Wave 1 — No-Regrets Cost Fixes (No New Infra)

**Goal:** Reduce Firestore reads and Places/ATTOM calls with query limits, session tokens, stronger debounce, and client-side request coalescing. No new services; all changes backward-compatible.

### 1.1 Firestore: Add limits to unbounded queries

| Task | File(s) | Change | Before → After | Expected impact |
|------|---------|--------|----------------|-----------------|
| Limit getPostsByAuthor | `src/services/postService.js` | Add `orderBy('createdAt','desc'), limit(100)` to query | Unbounded read → max 100 docs per call | Caps feed profile-tab reads |
| Limit getPostsByAuthors per chunk | `src/services/postService.js` | Add `orderBy('createdAt','desc'), limit(50)` per chunk; merge and sort; take first N | Up to 50×chunks reads → 50 per chunk, client merge | Caps "Following" feed reads |
| Limit getMessagesForUser | `src/services/messageService.js` | Add `limit(200)` to both recipientId and senderId queries | Unbounded × 2 → 200 × 2 max | Caps Messages page reads |
| Limit getFollowers | `src/services/followService.js` | Add `limit(100)` to getFollowers query | Unbounded → max 100 | Caps follower list reads |
| Cache searchUsers by query | `src/services/authService.js` | Use ttlCache by normalized query (e.g. 60s TTL); return cached if hit | 20 reads per keystroke → 20 reads per unique query per 60s | Reduces @-mention Firestore load |

**Firestore indexes (required for new queries):**  
Create composite indexes (Firestore Console will error with a link if missing):

- **posts:** `authorId` (Ascending) + `createdAt` (Descending) — for getPostsByAuthor and getPostsByAuthors.
- **messages:** `recipientId` (Ascending) + `createdAt` (Descending); `senderId` (Ascending) + `createdAt` (Descending) — for getMessagesForUser.

**QA:** Feed (For You, Following, Profile), Messages, Followers list, @-mention in Feed composer.  
**Rollback:** Revert limit/cache changes in each file.  
**Effort:** S

### 1.2 Google Places: Session token (AddressAutocomplete + Feed) — follow-up

| Task | File(s) | Change | Before → After | Expected impact |
|------|---------|--------|----------------|-----------------|
| Session token in AddressAutocomplete | `src/components/AddressAutocomplete.jsx` | Replace Autocomplete **widget** with **AutocompleteService.getPlacePredictions** + custom dropdown; create one session token per session; call **getDetails** with same token on select, then create new token | Each interaction can bill as new session → one session per address selection | Lower Places billing per flow |
| Session token in Feed address composer | `src/pages/Feed.jsx` | Use AutocompleteService with session token: create token, getPlacePredictions with token; on select getDetails with same token, then clear | Same as above for ^address | Lower Places billing in Feed |

**Note:** The legacy Autocomplete widget does not accept a session token; session pricing requires the programmatic AutocompleteService + getDetails with the same token. Implement when ready (UI: custom input + dropdown).  
**QA:** Address input (ListProperty, EditProperty, Home search, Dashboard, Feed ^address). Select address and submit; repeat; confirm no duplicate billing pattern.  
**Rollback:** Remove session token usage; restore previous Autocomplete/ getDetails calls.  
**Effort:** M

### 1.3 Map: Stronger debounce when flag ON

| Task | File(s) | Change | Before → After | Expected impact |
|------|---------|--------|----------------|-----------------|
| USE_MAP_DEBOUNCE | `src/components/PropertyMap.jsx` | When USE_MAP_DEBOUNCE true: debounce 1000ms (else 600ms), movedEnough distance 500m (else 350m), min interval 1200ms (else 800ms) | Fewer getMapParcels calls per pan/zoom when flag on | Lower ATTOM/Firestore when enabled |

**QA:** Map browse, zoom in to see unlisted pins; pan/zoom; confirm pins still load and feel responsive with flag ON.  
**Rollback:** Set USE_MAP_DEBOUNCE=false or revert.  
**Effort:** S

### 1.4 Client: In-flight deduplication for parcelService

| Task | File(s) | Change | Before → After | Expected impact |
|------|---------|--------|----------------|-----------------|
| Coalesce identical requests | `src/services/parcelService.js` | Maintain a map of in-flight keys (e.g. cacheKey for getMapParcels); if same key requested while in flight, return same promise; clear on settle | Duplicate concurrent requests (e.g. two components same bounds) → one network call | Fewer ATTOM/Function calls |

**QA:** Rapid map pan or two mounts requesting same tile; verify single request in network tab.  
**Rollback:** Remove in-flight map; restore direct fetch.  
**Effort:** S

### Wave 1 completion

- **1.1** Firestore limits and searchUsers TTL cache: done.
- **1.2** Session token: AddressAutocomplete and Feed ^address composer: done.
- **1.3** Map debounce (USE_MAP_DEBOUNCE): done.
- **1.4** Parcel in-flight deduplication: done.
- **Firestore indexes:** `firestore.indexes.json` defines composite indexes for `posts` (authorId + createdAt) and `messages` (recipientId + createdAt, senderId + createdAt). Deploy with: `firebase deploy --only firestore:indexes`. Indexes may take a few minutes to build.

---

## Wave 2 — Vercel API + Redis for ATTOM Cache

**Goal:** Move ATTOM cache from Firestore to Redis; serve ATTOM via Vercel serverless so we can later centralize all server data access.

### 2.1 Upstash Redis

- Create Upstash Redis (serverless) in dashboard; get REST URL + token.
- Env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (Vercel + local .env).

### 2.2 Vercel Serverless API routes

- Add `/api` directory at project root (Vite app can coexist; Vercel will serve /api/* as serverless).
- Routes:
  - `GET /api/attom/map?n=&s=&e=&w=&zoom=` → same contract as getMapParcels; use Redis for tile cache (key e.g. `attom:map:{tileKey}`), fallback to ATTOM API.
  - `POST /api/attom/address` body `{ address, n, s, e, w }` → same as resolveAddress; Redis key `attom:addr:{normalizedAddress}`.
  - `GET /api/attom/snapshot?attomId=&lat=&lng=` → same as getPropertySnapshot; Redis key `attom:snap:{attomId}`.
- Reuse logic from `functions/attomService.js` (or copy): tile key, radius, singleflight, TTLs. Replace Firestore get/set with Redis get/set.
- Env: `ATTOM_API_KEY` in Vercel.

### 2.3 Client: Use Vercel API when flag ON

- Feature flag: `USE_ATTOM_CACHE` or new `VITE_USE_VERCEL_ATTOM`.
- In `parcelService.js`: when flag true, base URL = `window.location.origin` (or `VITE_API_BASE`) + `/api/attom/...`; when false, keep current Firebase Functions URL.
- No change to component code; only parcelService base URL and path.

**QA:** Map pins, address resolve (Home, ListProperty), property snapshot (PropertyDetail). Compare with flag OFF (Firebase) and ON (Vercel + Redis).  
**Rollback:** Flag OFF; optionally remove /api routes.  
**Effort:** L

---

## Wave 3 — DAL: Client Calls API Only for ATTOM/Places

**Goal:** No client direct calls to Firebase Functions (ATTOM) or Google Places/Geocoding; all go through your API. Prep for future Postgres/Meilisearch.

### 3.1 API routes for Places (proxy)

- `POST /api/places/autocomplete` body `{ input, sessionToken? }` → call Google Places Autocomplete, return predictions; accept session token for billing.
- `POST /api/places/details` body `{ placeId, sessionToken? }` → getDetails, return formatted_address + components.
- `POST /api/places/geocode` body `{ address }` → Geocoder.geocode, return first result.
- Env: `GOOGLE_MAPS_API_KEY` server-side only.

### 3.2 Client: Use API when USE_SERVER_DATA_LAYER true

- AddressAutocomplete, Feed, Home: when flag true, call `/api/places/*` instead of loading Google script and calling Places/Geocoder from client. Pass session token from API response for details.
- Remove (or lazy-load) client Google script when flag true for address flows.

**QA:** All address inputs and Feed ^address; unlisted search on Home.  
**Rollback:** Flag OFF.  
**Effort:** L

---

## Wave 4 — Postgres (One Domain: Social)

**Goal:** Introduce Neon Postgres; migrate one bounded domain (posts, comments, likes, follows) with dual-write and shadow-read, then switch reads.

### 4.1 Schema (social)

- Tables: `users` (id, email, name, public_username, created_at, updated_at), `posts`, `comments`, `post_likes`, `user_following`. (Exact DDL in Phase 5.)
- Sync: On create/update/delete in Firestore (posts, etc.), also write to Postgres (API route or call from client via API). Read path: when USE_SERVER_DATA_LAYER (and social read switch), read from Postgres.

### 4.2 API routes for social

- `GET /api/feed/for-you?limit=&cursor=` → read from Postgres.
- `GET /api/feed/following?limit=&cursor=` → read from Postgres (posts by followed users).
- `GET /api/posts/by-author?authorId=&limit=` → read from Postgres.
- Writes: `POST /api/posts`, `POST /api/posts/:id/comments`, like/follow endpoints; write to both Firestore and Postgres during dual-write.

### 4.3 Client

- When feature flag (e.g. USE_SERVER_DATA_LAYER) and social-read flag: Feed and post-related calls go to API; otherwise keep Firestore services.

**QA:** Create post, comment, like, follow; load For You and Following; compare Firestore vs Postgres data.  
**Rollback:** Disable flags; stop dual-write if needed.  
**Effort:** L

---

## Wave 5 — Meilisearch for Map Pins

**Goal:** Index listed properties in Meilisearch (geo + attributes); map browse viewport query hits Meilisearch instead of "get all properties" from Firestore.

### 5.1 Meilisearch

- Create index with geo and filterable attributes; sync from Postgres or Firestore (script or Cron).

### 5.2 API

- `GET /api/map/pins?n=&s=&e=&w=&filters=` → query Meilisearch geo; return pins. When USE_SEARCH_INDEX, Home/PropertyMap call this instead of getAllProperties + client filter.

### 5.3 Client

- When USE_SEARCH_INDEX: parcelService or new mapService calls /api/map/pins for listed; keep unlisted (ATTOM) as is.

**QA:** Map browse, filters; compare pins with current behavior.  
**Rollback:** Flag OFF.  
**Effort:** M

---

## Wave 6 — R2 Proxy for Media

**Goal:** New uploads go to R2 via API; serve URLs from R2. Optional dual-write to Firebase during migration.

### 6.1 R2 + API

- Cloudflare R2 bucket; S3-compatible API. Vercel API route: `POST /api/upload` (multipart or presigned); store in R2; return public or signed URL.

### 6.2 Client

- When USE_OBJECT_STORAGE_PROXY: storageService upload calls /api/upload instead of Firebase Storage; download uses returned URL (R2).

**QA:** Upload photo (property, post, profile); open in new tab; delete.  
**Rollback:** Flag OFF.  
**Effort:** M

---

## Execution Order (This Branch)

1. **Wave 1** (all tasks 1.1–1.4) — implement and commit.
2. **Wave 2** — after Wave 1 merged or stable; requires Upstash + Vercel env.
3. Waves 3–6 — in order as needed; each gated by flags and QA.

---

## Success Metrics (Wave 1)

- Firestore: Lower read count per Feed load, Messages load, getFollowers, searchUsers (cache).
- Places: Same UX; lower billed sessions (session token).
- Map: When USE_MAP_DEBOUNCE on, fewer getMapParcels calls per minute of pan/zoom.
- Parcel: Fewer duplicate in-flight requests in network tab.

No formal $/day target until instrumentation has run; use Phase 1 metrics before/after to compare.
