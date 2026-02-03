# Firestore Efficiency Strategy

This doc reviews Firestore read/write patterns and a **strategy** to reduce cost.

**Tier 1 – Implemented:** Query limits and debounce (`getFeedbackList` limit, `getAllProperties`/`searchProperties` limit 1000, Feed @-mention debounce + min 2 chars). **Quick win:** `searchUsers` limit reduced from 100 to 20.

**Tier 2 – Implemented:** Client-side TTL cache (`src/utils/ttlCache.js`): ATTOM data in parcelService (map 5 min, address/snapshot 10 min); properties list in propertyService (3 min, invalidated on create/claim); feedback list in feedbackService (2 min, invalidated on submit, Refresh button uses skipCache).

---

## 1. Where Firestore Reads Come From

### 1.1 Unbounded or large queries (high impact)

| Location | What it does | Reads per call | Called from |
|----------|--------------|----------------|-------------|
| **getAllProperties()** | `getDocs(collection(db, 'properties'))` — **no limit** | **N = total properties** | Home (Browse), Dashboard (favorites), Feed (resolvePropertyMatch when cache empty) |
| **searchProperties(filters)** | Same — full collection, then client-side filter | **N = total properties** | Home (loadPropertiesWithFilters on filter change) |
| **getFeedbackList(100)** | `getDocs(query(..., orderBy('createdAt','desc')))` — **no limit in query**; slice to 100 in code | **N = total feedback docs** | Feedback page on load |

So: every Home load, every Dashboard load (when user has favorites), every Feed load when resolving address, and every Feedback page load can trigger **one read per document in the collection**. If you have 2,000 properties and 500 feedback docs, that’s 2,000 + 500 reads from just a few page loads.

### 1.2 ATTOM cache (Cloud Function)

| Flow | Firestore read | When |
|------|----------------|------|
| **getMapParcels** | 1 read per request to `map_search_snapshot` (or in-memory hit in same instance) | Every map idle at zoom ≥ 18; every pan to new tile |
| **resolveAddress** | 1 read to `address_attom_map`; on miss may also read/write `property_snapshots` | Every address resolution (e.g. Home search, unlisted parcel) |
| **getPropertySnapshot** | 1 read to `property_snapshots` per request | Every Property Detail load that uses ATTOM enrichment |

In-memory cache in the Cloud Function only helps when the **same instance** serves repeated requests. Cold starts and different instances always hit Firestore. So **every** map tile request, address resolution, and property snapshot request typically causes **at least one Firestore read** (and often one write on miss).

### 1.3 Other notable patterns

- **searchUsers(query)** — `getDocs(collection('users'), limit(100))` = **100 reads per call**. Triggered by Feed composer `useEffect` on `mentionQuery` (every keystroke after `@`).
- **getFavoritesForProperty** — 1 query for favorites + **1 getDoc(users, userId) per favorite** (N+1). Many property detail views = many reads.
- **Feed load** — getAllPosts(50) + getPostsByAuthors (chunked) + getLikedPostIds + getFollowing + optional getAllProperties for resolvePropertyMatch. Already bounded but additive.
- **Dashboard load** — getAllProperties() when user has favorites (full collection), plus offers, drafts, transactions, etc.

---

## 2. Strategy Tiers

### Tier 1 – Quick wins (low effort, high impact)

1. **Cap feedback list query**
   - **Current:** getFeedbackList runs `getDocs(q)` with no limit; then slices to 100 in code. So you pay for **every** feedback document on every Feedback page load.
   - **Change:** Add `limit(limitCount)` to the Firestore query so the query returns at most 100 docs.
   - **Effect:** Feedback page reads drop from N (all feedback docs) to 100.

2. **Cap properties queries**
   - **Current:** getAllProperties() and searchProperties() use `getDocs(collection)` with **no limit**. Every Home load, Dashboard load (with favorites), and Feed address resolution can read the **entire** properties collection.
   - **Change:** Add a hard limit to the query, e.g. `limit(500)` or `limit(1000)`, and document that “browse” is first 500/1000 by creation order (or add a single orderBy + limit). For searchProperties, same: limit + client-side filter on the limited set.
   - **Effect:** Properties-related reads per session drop from N (all properties) to a fixed cap. Prevents cost from growing with property count.

3. **Debounce and gate searchUsers**
   - **Current:** Every change to `mentionQuery` in the Feed composer triggers searchUsers → 100 reads. Fast typing = many calls.
   - **Change:** Debounce (e.g. 300 ms) and only call when `mentionQuery.length >= 2`.
   - **Effect:** Fewer 100-read bursts per user session.

**Rough impact:** If you have hundreds of feedback docs and hundreds/thousands of properties, Tier 1 alone can cut a large portion of “full collection” reads (feedback + properties) and reduce @-mention read spikes.

---

### Tier 2 – Medium effort (client-side caching, fewer refetches)

4. **Client-side cache for ATTOM-backed data**
   - **Current:** Every getMapParcels / getPropertySnapshot call from the client triggers the Cloud Function, which does at least one Firestore read. Revisiting the same map area or same property = same reads again.
   - **Change:** In the client (e.g. Home, PropertyMap, CompsMap, PropertyDetail), cache results by tileKey or attomId with a short TTL (e.g. 5–10 minutes). Reuse cached result instead of calling the function again.
   - **Effect:** Same user, same map/property within the TTL = no extra HTTP call = no extra Firestore read in the function. Reduces ATTOM-driven read volume.

5. **Short-lived cache for getAllProperties in Feed/Dashboard**
   - **Current:** resolvePropertyMatch and Dashboard favorites call getAllProperties() when cache is empty; every full page load or tab switch can refetch.
   - **Change:** Cache the list in memory (or sessionStorage) with a short TTL (e.g. 2–5 min). Reuse until TTL expires.
   - **Effect:** Fewer full-collection (or capped) property reads per session.

6. **getFeedbackList(100) usage**
   - Already improved once you add `limit(100)` (Tier 1). Optionally: only refetch when user explicitly refreshes or after submitting feedback, not on every mount.

**Rough impact:** Tier 2 reduces repeated reads for the same data within a session (ATTOM + properties), especially for heavy map/property and feed users.

---

### Tier 3 – Larger / architectural

7. **Move ATTOM cache off Firestore**
   - **Current:** All ATTOM cache lookups and writes use Firestore (`map_search_snapshot`, `address_attom_map`, `property_snapshots`). Every map/address/snapshot request = 1+ read (and often 1 write on miss).
   - **Change:** Store ATTOM cache in a different backend (e.g. Redis / Cloud Memorystore, or Cloud Run with in-memory cache and min instances). Cloud Function calls Redis instead of Firestore for cache get/set.
   - **Effect:** Firestore read/write volume from ATTOM goes to zero. Cost shifts to Redis/Memorystore (or more Cloud Run compute). Requires new infra and function changes.

8. **Properties: pagination and indexed queries**
   - **Current:** Full collection fetch (or capped) with client-side filter/sort.
   - **Change:** Add Firestore index(es) and query with `where` + `orderBy` + `limit` + `startAfter` for pagination. Home/Dashboard only load first page (e.g. 50–100 docs).
   - **Effect:** Bounded reads per page; cost doesn’t grow with total property count. Requires UI pagination and possibly composite indexes.

9. **Shrink or shorten property_snapshots**
   - **Current:** Each doc stores the **full** ATTOM API response (large).
   - **Change:** Store only a normalized summary (e.g. sections you actually use) or shorten TTL so fewer/smaller docs are kept. Doesn’t reduce read *count* but reduces Firestore **storage** and can reduce read **cost** if pricing is size-sensitive.
   - **Effect:** Lower storage and possibly lower cost per read; same number of reads unless you also reduce how often you call getPropertySnapshot (e.g. via Tier 2 client cache).

10. **Favorites with user details**
    - **Current:** N+1: one query for favorites, then one getDoc(users, userId) per favorite.
    - **Change:** Batch getDoc for users or maintain a small “user display info” cache; or denormalize display name/avatar into the favorites doc so you don’t need to read users for list view.
    - **Effect:** Fewer reads per property detail page when many users have favorited.

---

## 3. “Accept Spend” vs “Optimize”

- **Accept spend:** Firestore cost will grow with traffic and data size. Setting budget alerts and planning for some growth is reasonable. The optimizations above **slow** growth and **cap** worst-case patterns; they don’t eliminate cost.
- **Optimize:** Tier 1 is the highest leverage for the least effort (query limits + debounce). Tier 2 improves per-session efficiency without big architectural changes. Tier 3 is for when you need to scale or want to move ATTOM cost off Firestore entirely.

---

## 4. Summary Table

| Area | Current behavior | Tier 1 | Tier 2 | Tier 3 |
|------|------------------|--------|--------|--------|
| Feedback list | Read all feedback docs | Add limit(100) to query | Optional: refetch only on submit/refresh | — |
| Properties (Home/Dashboard/Feed) | Read full collection (no limit) | Add limit (e.g. 500/1000) | Client cache 2–5 min | Pagination + indexed queries |
| @ mention search | 100 reads per keystroke | Debounce + min 2 chars | — | — |
| ATTOM (map/address/snapshot) | 1+ Firestore read per request | — | Client cache by tile/attomId (5–10 min) | Move cache to Redis/Memorystore |
| property_snapshots size | Full ATTOM payload per doc | — | — | Store summary only or shorten TTL |
| Favorites + user details | N+1 getDoc(users) | — | — | Batch or denormalize |

---

## 5. Recommendation

- **Do Tier 1 first:** Add `limit` to feedback and properties queries, and debounce/gate searchUsers. Low risk, quick to implement, and directly addresses unbounded and bursty reads.
- **Then consider Tier 2:** Client-side caching for ATTOM results and for properties list where it’s used for resolution/favorites. Reduces repeated reads within a session.
- **Tier 3** is for when you need to scale further or want to move ATTOM cache off Firestore; it’s a larger change.

You can still expect Firestore cost to grow with active users and usage; the goal is to remove the **worst** patterns (full collection scans, unbounded feedback list, and @-mention read storms) and to avoid repeating the same reads unnecessarily (client cache). After that, increasing expected spend and setting alerts is a reasonable operational choice.

Tier 1: `src/services/feedbackService.js`, `src/services/propertyService.js`, `src/pages/Feed.jsx`. Tier 2: `src/utils/ttlCache.js`, `src/services/parcelService.js`, `src/services/propertyService.js`, `src/services/feedbackService.js`, `src/pages/Feedback.jsx`. Quick win: `src/services/authService.js` (searchUsers limit 20).
