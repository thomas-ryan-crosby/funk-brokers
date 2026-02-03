# Phase 0 — Codebase Review & Cost Driver Analysis

**Branch:** `dev/cost-architecture-refactor`  
**Scope:** Full repo scan for Firebase, Google Maps, ATTOM touchpoints and hot paths.  
**Note:** The app is **Vite + React** (not Next.js). Frontend is hosted on Vercel via `vercel.json`; there is no Next.js server. All “server” logic today is **Firebase Cloud Functions** (Node) and **client-side** Firestore/Storage/Auth.

---

## 1) Repo Map (Folders + Purpose)

| Path | Purpose |
|------|--------|
| **Root** | Vite app entry (`index.html`, `vite.config.js`), `package.json`, `vercel.json` |
| **`/src`** | Frontend source |
| **`/src/main.jsx`** | React entry; mounts `App.jsx` with router |
| **`/src/App.jsx`** | Root component, route definitions |
| **`/src/config/`** | `firebase.js` (init Firestore, Auth, Storage, Functions), `firebase-config.js` (project config) |
| **`/src/contexts/`** | `AuthContext.jsx` — auth state, user profile loading |
| **`/src/services/`** | All data access: Firestore services (properties, posts, offers, auth, etc.), `parcelService.js` (ATTOM via Cloud Functions), `storageService.js` (Firebase Storage) |
| **`/src/pages/`** | Route-level pages: Home (browse), Dashboard, Feed, PropertyDetail, ListProperty, EditProperty, SubmitOffer, TransactionManager, SignIn/SignUp, Profile, etc. |
| **`/src/components/`** | Reusable UI: PropertyMap, CompsMap, AddressAutocomplete, CityStateAutocomplete, SearchFilters, PropertyCard, modals, etc. |
| **`/src/utils/`** | `loadGooglePlaces.js` (Maps API loader), `ttlCache.js` (client TTL cache), `attomSnapshotNormalizer.js`, `verificationScores.js`, etc. |
| **`/src/data/`** | Static data (e.g. `processSteps.js`) |
| **`/src/styles/`** | `theme.css` |
| **`/functions`** | Firebase Cloud Functions: `index.js` (HTTP endpoints + Persona callable), `attomService.js` (ATTOM + Firestore cache) |
| **`/firebase/`** | `admin.js` (Firebase Admin init for server-side; used by Functions), `serviceAccountKey.json.example` |
| **`/public/`** | Static assets, brand logos |
| **`/scripts/`** | Node scripts: `populateDummyData.js`, `clearAllData.js`, `backfillPropertyCoordinates.js`, etc. |
| **`/docs/`** | PRDs, setup (ATTOM, Firebase, Google Maps), efficiency notes |

---

## 2) Firebase Touchpoints

### 2.1 Firestore — Collections & Usage

| Collection | Service / File | Operations | Notes |
|------------|----------------|-------------|--------|
| **properties** | `propertyService.js` | addDoc, getDocs, getDoc, updateDoc, deleteDoc | getAllProperties/searchProperties: `limit(1000)`, client-side filter; 3 min TTL cache. getPropertyById + getOffersByProperty for under_contract. |
| **users** | `authService.js` | setDoc, getDoc, getDocs (searchUsers) | searchUsers: `getDocs(query(usersRef, limit(20)))` — no filter by query; reads up to 20 users every @-mention keystroke. |
| **posts** | `postService.js` | addDoc, getDocs, updateDoc, deleteDoc, increment | getAllPosts(50), getPostsByAuthor (no limit), getPostsByAuthors (chunked `in`, 10 per chunk), getPostsForProperty, getPostsForAddress, getCommentsForPost; addComment writes subcollection + increments commentCount. |
| **post subcollection: comments** | `postService.js` | addDoc, getDocs, orderBy | getCommentsForPost; no limit. |
| **post subcollection: likes** | `likeService.js` | setDoc, deleteDoc, updateDoc | Like/unlike: write to post/likes/{userId}, update post likeCount, update userLikes doc. |
| **userLikes** | `likeService.js` | getDoc, setDoc, updateDoc | One doc per user; postIds array. |
| **userFollowing** | `followService.js` | getDoc, setDoc, updateDoc, getDocs | getFollowing (1 read), getFollowers: `where('following', 'array-contains', userId)` — unbounded read. |
| **offers** | `offerService.js` | addDoc, getDocs, getDoc, updateDoc | getOffersByProperty, getOffersByBuyer (no limit), getOfferById. |
| **psaDrafts** | `psaDraftService.js` | addDoc, getDocs, getDoc, updateDoc, deleteDoc | getPsaDraftsByBuyer (no limit). |
| **transactions** | `transactionService.js` | addDoc, getDocs, getDoc, updateDoc | getTransactionsByUser, getTransactionByOfferId (no limit). |
| **favorites** | `favoritesService.js` | addDoc, getDocs, getDoc, deleteDoc | getUserFavoriteIds, getFavoriteCountForProperty, getFavoritesForProperty + N getDoc(users) for profiles. |
| **preListingChecklists** | `preListingChecklistService.js` | getDoc, setDoc | One doc per propertyId. |
| **listingProgress** | `listingProgressService.js` (and inline in `ListProperty.jsx`) | getDoc, setDoc, deleteDoc | One doc per propertyId; ListProperty imports firestore and deletes doc on success. |
| **feedback** | `feedbackService.js` | addDoc, getDocs (limit 100), orderBy | 2 min TTL cache. |
| **pings** | `pingService.js` | addDoc, getDocs | getPingsForProperty, getPingsForUser (no limit). |
| **messages** | `messageService.js` | addDoc, getDocs | getMessagesForUser: two unbounded queries (recipientId, senderId), merge client-side. |
| **saleProfiles** / **purchaseProfiles** / **savedSearches** | `profileService.js` | getDoc, setDoc, updateDoc, getDocs | getSavedSearches: where userId, no limit. |
| **vendors** | `vendorService.js` | addDoc, getDocs, getDoc, updateDoc, deleteDoc | getVendorsByUser (no limit). |

**Cloud Functions (Firestore used only in ATTOM cache):**

| Collection | File | Operations | Notes |
|------------|------|------------|--------|
| **map_search_snapshot** | `functions/attomService.js` | getDoc, setDoc | One doc per tile key (zoom:x:y). Read on every getMapParcels; write on cache miss. |
| **address_attom_map** | `functions/attomService.js` | getDoc, setDoc | One doc per normalized address. Read on resolveAddress; write on miss. |
| **property_snapshots** | `functions/attomService.js` | getDoc, setDoc | One doc per attomId; **full ATTOM payload** per doc. Read on getPropertySnapshot; write on miss. |

No real-time listeners (`onSnapshot`) in the codebase; all reads are one-shot.

### 2.2 Firebase Storage

| Usage | File(s) | Operations |
|-------|---------|------------|
| **Upload** | `storageService.js`: uploadBytes, uploadBytesResumable, getDownloadURL | Used by: Feed (post images), Profile (avatar, docs), UserProfile (avatar), Dashboard (docs), ListProperty (photos, docs), EditProperty (photos, docs), GetVerified (many doc types + photos/videos), PreListingChecklist, BuyerVerificationChecklist. |
| **Delete** | `storageService.js`: deleteObject | deleteFile(path). |

All Storage access is **client-side** via Firebase JS SDK. No server-side proxy.

### 2.3 Firebase Auth

| Usage | File(s) | Operations |
|-------|---------|------------|
| **Auth** | `authService.js`, `config/firebase.js` | createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword. |
| **Consumers** | AuthContext, SignIn, SignUp, protected routes | AuthContext uses onAuthStateChange + getUserProfile(uid) on login. |

Auth is entirely client-side. No custom token or Admin Auth in the reviewed app code (Persona uses callable function with context.auth).

---

## 3) Google Maps Usage

| Location | Purpose | APIs / Patterns |
|----------|---------|------------------|
| **`src/utils/loadGooglePlaces.js`** | Load Maps JS API with `places` library | Single script tag, callback; `API_KEY` from `VITE_GOOGLE_MAPS_API_KEY` or firebase config. |
| **`src/components/PropertyMap.jsx`** | Map + listed pins + unlisted parcels | Map render, markers, InfoWindow; on `idle`: viewport callback, **debounced** (600 ms) + movedEnough (~350 m or zoom change) before calling `getMapParcels`. Unlisted only when zoom >= 18. |
| **`src/components/CompsMap.jsx`** | Comps map | Map render, single marker, bounds; on idle fetches comps (no ATTOM; likely local data). |
| **`src/components/AddressAutocomplete.jsx`** | Address input with autocomplete | `Autocomplete` on input (types: address, country: us). On place_changed: address_components or **Place Details** (getDetails) or **Geocoder** (geocode). **No session token**; each session can bill multiple Autocomplete + Place Details + Geocoding. |
| **`src/components/CityStateAutocomplete.jsx`** | City/state input | Autocomplete (types: address), no getDetails/geocode in snippet. |
| **`src/pages/Home.jsx`** | Unlisted parcel for search query | **Geocoder.geocode({ address: query })** then bounds → **resolveAddressToParcel** (Cloud Function). One geocode per search when no listed match. |
| **`src/pages/Feed.jsx`** | Inline address in post composer | **AutocompleteService.getPlacePredictions** (no session token); on select **PlacesService.getDetails** (formatted_address). Also **searchUsers** (Firestore) for @mentions. |

**Summary:** Map renders and markers use Maps JavaScript; Places Autocomplete, Place Details, and Geocoding are used from the client. No server-side proxy; no session tokens for Places (each interaction can incur Autocomplete + Details + Geocoding).

---

## 4) ATTOM Usage

| Endpoint | Where Called | Frequency Pattern |
|----------|--------------|-------------------|
| **getMapParcels** | Client: `parcelService.getMapParcels` ← `PropertyMap.jsx` (on map idle, debounced 600 ms, movedEnough ~350 m, zoom ≥ 18) | Per viewport move when zoomed in; client TTL 5 min; server: tile cache (Firestore + in-memory), singleflight, rate limit 600 ms per requesterKey:tileKey. |
| **resolveAddress** | Client: `parcelService.resolveAddressToParcel` ← Home.jsx (unlisted search), ListProperty/EditProperty/UnlistedPropertyModal flows | Per address resolution; client TTL 10 min; server: address_attom_map cache, singleflight. |
| **getPropertySnapshot** | Client: `parcelService.getPropertySnapshot` ← PropertyDetail.jsx (when property has attomId + lat/lng) | Once per property detail view; client TTL 10 min; server: property_snapshots cache (full payload), singleflight, stale-while-revalidate. |

**ATTOM API:** Single upstream: `allevents/snapshot` (radius + lat/lng). Used in `functions/attomService.js` for map tile, address resolve, and snapshot; all go through Firestore (and in-memory) cache. **Cost:** Every cache miss = 1 ATTOM call + 1–2 Firestore writes (and 1+ read). Large `property_snapshots` docs (full ATTOM response) drive Firestore storage and read volume.

---

## 5) Hot Paths

| Hot Path | Trigger | What Runs | Cost / Risk |
|----------|---------|-----------|-------------|
| **Map drag / zoom** | User pans or zooms map (zoom ≥ 18) | PropertyMap `idle` → debounce 600 ms → movedEnough → `getMapParcels(bounds, zoom)` → parcelService (client cache 5 min) → Cloud Function getMapParcels → Firestore read map_search_snapshot (or ATTOM + write). | Many tile keys per session; rate limit 600 ms per tile per IP; client cache reduces repeats. Still: Firestore read per distinct tile. |
| **Feed load / refresh** | Feed page load or tab switch | loadFeedData: getAllProperties (capped 1000, 3 min cache), getFollowing, getLikedPostIds; getAllPosts(50), getPostsByAuthors(ids), getPostsByAuthor(uid). Plus getPropertiesBySeller. | Multiple Firestore reads; getPostsByAuthor has no limit; getPostsByAuthors does chunked `in` (10) so many reads if following many users. |
| **Feed infinite scroll** | Not present in codebase. Feed loads a fixed set (50 For You, all from following, all my posts). | N/A for “infinite scroll.” Cost is one-time load: getAllPosts(50), getPostsByAuthors (up to 3 chunks of 10), getPostsByAuthor (unbounded). | getPostsByAuthor and getFollowers are unbounded. |
| **Property detail hydration** | Navigate to /property/:id | getPropertyById (1 + getOffersByProperty if under_contract), getPreListingChecklist, getPostsForPropertyOrAddress (property + address queries), checkFavoriteStatus (getFavorite), getFavoriteCountForProperty, getPropertySnapshot (parcelService → Cloud Function → Firestore/ATTOM). | 1 property + offers + checklist + posts (2 queries) + favorites (1 + N users for list) + 1 snapshot (Firestore/ATTOM). |
| **Search / filters (Home)** | Filter change or search query | searchProperties(filters) → Firestore query limit 1000, client-side filter; if no listed match and query has digits, loadUnlistedForQuery: Geocoder + resolveAddressToParcel. | One big read (1000) per filter change (cache 3 min); plus Geocoding + resolveAddress per unlisted lookup. |
| **@mention / address in Feed** | Typing in post composer | searchUsers: getDocs(users, limit(20)) every 300 ms debounce for @; getPlacePredictions for ^ address. | 20 user reads per debounced @ query; Places Autocomplete per address suggestion (no session token). |

---

## 6) TOP 5 COST DRIVERS

### 1) ATTOM-backed Firestore cache (map + address + snapshot)

- **Files:** `functions/attomService.js`, `functions/index.js`; client `src/services/parcelService.js`; `PropertyMap.jsx`, `Home.jsx`, `PropertyDetail.jsx`.
- **Functions:** `getMapParcels`, `resolveAddress`, `getPropertySnapshot` (Cloud Functions); client `getMapParcels`, `resolveAddressToParcel`, `getPropertySnapshot`.
- **Why expensive:** Every map tile (zoom ≥ 18), address resolution, and property snapshot does **at least one Firestore read** (often two: read + write on miss). `property_snapshots` stores the **full ATTOM response** per doc → large docs and high read/write volume. With 2 active users doing map browsing and property details, this can easily reach hundreds of reads/day and significant storage.
- **Existing mitigations:** Client TTL (5/10 min), server singleflight, server rate limit (600 ms per tile), server in-memory + Firestore cache. Cost remains high because the cache *is* in Firestore.

### 2) Properties list / search: large capped query + client-side filter

- **Files:** `src/services/propertyService.js` (`getAllProperties`, `searchProperties`), `src/pages/Home.jsx`, `src/pages/Dashboard.jsx`, Feed (getAllProperties for resolvePropertyMatch).
- **Functions:** `getAllProperties()`, `searchProperties(filters)`.
- **Why expensive:** Both use `orderBy('createdAt','desc'), limit(1000)`. Every filter change or initial load can read up to **1000 documents** (cached 3 min). Home, Dashboard, and Feed all call getAllProperties or searchProperties; Feed also calls it when resolving ^address. No pagination; all filtering is client-side.
- **Existing mitigations:** Cap at 1000, 3 min TTL cache. Still a high read count per user session when switching views/filters.

### 3) Feed: unbounded and multi-query reads

- **Files:** `src/services/postService.js`, `src/services/authService.js`, `src/pages/Feed.jsx`.
- **Functions:** `getAllPosts(50)`, `getPostsByAuthors(ids)` (chunked `in`, 10 per query), `getPostsByAuthor(userId)` (no limit); `searchUsers` (limit(20), no where clause).
- **Why expensive:** `getPostsByAuthor` has **no limit** → one query returns all posts by that user. Feed loads For You (50) + Following (N queries for N/10 authors) + profile (unbounded). Opening Feed also loads getPropertiesBySeller, getFollowing, getLikedPostIds. **searchUsers** for @mentions does `getDocs(usersRef, limit(20))` with **no filter** → 20 user reads per debounced keystroke, then client-side name/email match.
- **Existing mitigations:** getAllPosts(50); getPostsByAuthors chunked. No limit on getPostsByAuthor, getMessagesForUser, getFollowers, or searchUsers filter.

### 4) Google Maps / Places: client-side, no session token, no proxy

- **Files:** `src/utils/loadGooglePlaces.js`, `src/components/AddressAutocomplete.jsx`, `src/components/CityStateAutocomplete.jsx`, `src/pages/Home.jsx`, `src/pages/Feed.jsx`, `PropertyMap.jsx`, `CompsMap.jsx`.
- **Functions:** Autocomplete, Place Details (getDetails), Geocoder.geocode, getPlacePredictions, Map render.
- **Why expensive:** Every address autocomplete session can generate multiple **Autocomplete** requests + **Place Details** + **Geocoding**; billing is per session and per request. **No session token** in AddressAutocomplete/Feed → each selection can be billed as new session. All calls from client; no server proxy or caching for Places/Geocoding.
- **Existing mitigations:** Map: debounce and movedEnough reduce getMapParcels calls. No mitigations for Places session token or server-side proxy.

### 5) Property detail + favorites: N+1 and heavy one-shot load

- **Files:** `src/pages/PropertyDetail.jsx`, `src/services/propertyService.js`, `src/services/favoritesService.js`, `src/services/postService.js`, `src/services/parcelService.js`.
- **Functions:** getPropertyById, getOffersByProperty, getPreListingChecklist, getPostsForPropertyOrAddress, getFavorite/getFavoriteCountForProperty/getFavoritesForProperty, getPropertySnapshot.
- **Why expensive:** Single property view triggers: 1 property read, optional offers read, 1 checklist read, 2 post queries (by propertyId + by address), 1 favorite check, 1 favorite count query, **getFavoritesForProperty** then **one getDoc(users) per favoriting user** (N+1), plus getPropertySnapshot (Cloud Function → Firestore/ATTOM). No pagination on posts or favorites list.
- **Existing mitigations:** Client TTL for snapshot (10 min). No batching of user profile reads for favorites list.

---

## 7) Summary Table: Cost Drivers

| # | Driver | Primary location | Why expensive |
|---|--------|------------------|----------------|
| 1 | ATTOM Firestore cache | functions/attomService.js, parcelService, PropertyMap, Home, PropertyDetail | 1+ Firestore read/write per map tile, address resolve, snapshot; property_snapshots = full ATTOM payload. |
| 2 | Properties 1000-cap query | propertyService, Home, Dashboard, Feed | Up to 1000 reads per search/getAllProperties; multiple callers; client-side filter only. |
| 3 | Feed unbounded + searchUsers | postService, authService, Feed.jsx | getPostsByAuthor unlimited; getPostsByAuthors chunked but many chunks; searchUsers reads 20 users with no index/filter. |
| 4 | Google Places client, no session token | AddressAutocomplete, Feed, Home, loadGooglePlaces | Autocomplete + Details + Geocoding per session; no session token; no server proxy. |
| 5 | Property detail N+1 + snapshot | PropertyDetail, favoritesService, parcelService | Many reads per view; getFavoritesForProperty + N user docs; getPropertySnapshot → Firestore/ATTOM. |

---

**Next:** Phase 1 (instrumentation + feature flags), then Phase 2 (no-regrets cost fixes) and Phases 3–5 (target architecture, migration plan, data models) as requested.
