# Firestore Read Audit — Full Repo

**Date:** Feb 2025  
**Context:** ~20k reads/min, ~0 writes; goal reduce reads 90%+ with safe, flag-gated changes.

---

## 1) Realtime vs one-time

- **onSnapshot / collectionGroup:** **None** in `src/`. All access is one-time `getDocs`/`getDoc`.
- **Polling:** `App.jsx` — `setInterval(loadUnreadCount, 300_000)` (5 min) → `getMessagesForUser` (2 queries × 200 limit = 400 reads/call). No other polling that triggers Firestore.

---

## 2) Full table of Firestore access points

| File | Function / component | Collection / query shape | Realtime? | Limit / pagination | Cleanup |
|------|----------------------|---------------------------|-----------|--------------------|--------|
| propertyService.js | getAllProperties | properties, orderBy createdAt desc | No | limit(75) | N/A |
| propertyService.js | searchProperties | properties, orderBy createdAt desc | No | limit(75) | N/A |
| propertyService.js | getPropertiesBySeller | properties, where sellerId | No | limit(100) | N/A |
| propertyService.js | getPropertyById | properties (doc) | No | 1 doc (+ refetch) | N/A |
| postService.js | getPostsByAuthor | posts, where authorId, orderBy createdAt | No | limit(100) | N/A |
| postService.js | getPostsByAuthors | posts, where authorId in, orderBy | No | limit(50)/chunk | N/A |
| postService.js | getAllPosts | posts, orderBy createdAt | No | limit(100) | N/A |
| postService.js | getCommentsForPost | comments, where postId | No | limit(50) | N/A |
| postService.js | getPostsByProperty | posts, where propertyId | No | limit(20) | N/A |
| postService.js | getPostsByAddress | posts, where propertyAddress | No | limit(20) | N/A |
| postService.js | getCommentsForPost (count) | comments, where postId | No | no limit | N/A |
| likeService.js | getUserLikes, likePost, unlikePost | user_likes (doc), posts/likes (doc) | No | 1 doc each | N/A |
| followService.js | getFollowing, isFollowing, getFollowers | user_following (doc / collection) | No | getFollowers limit(100) | N/A |
| messageService.js | getMessagesForUser | messages, recipientId + senderId | No | limit(200) × 2 | N/A |
| authService.js | searchUsers | users | No | limit(20) | N/A |
| authService.js | getProfile, getProfileByUid | users (doc) | No | 1 doc | N/A |
| feedbackService.js | getFeedbackList | feedback | No | limit(param) | N/A |
| offerService.js | getOffersByProperty | offers, where propertyId | No | **NO LIMIT** | N/A |
| offerService.js | getOffersByBuyer | offers, where buyerId | No | **NO LIMIT** | N/A |
| psaDraftService.js | listByBuyer | psa_drafts, where buyerId | No | **NO LIMIT** | N/A |
| pingService.js | getPingsForSeller | pings, where sellerId | No | **NO LIMIT** | N/A |
| pingService.js | getPingsForSender | pings, where senderId | No | **NO LIMIT** | N/A |
| transactionService.js | getTransactionByOfferId | transactions, where offerId | No | 1 (first) | N/A |
| transactionService.js | getTransactionsByUser | transactions, where parties array-contains | No | **NO LIMIT** | N/A |
| profileService.js | getSavedSearches | saved_searches, where userId | No | **NO LIMIT** | N/A |
| profileService.js | getSaleProfile, getPurchaseProfile | sale_profiles / purchase_profiles (doc) | No | 1 doc | N/A |
| favoritesService.js | getUserFavoriteIds | favorites, where userId | No | **NO LIMIT** | N/A |
| favoritesService.js | getFavoriteCountForProperty | favorites, where propertyId | No | **NO LIMIT** | N/A |
| favoritesService.js | getFavoritesForProperty | favorites, where propertyId + getDoc users | No | **NO LIMIT** + N docs | N/A |
| vendorService.js | getVendorsByUser | vendors, where userId | No | **NO LIMIT** | N/A |
| listingProgressService.js | getProgress | listing_progress (doc) | No | 1 doc | N/A |
| preListingChecklistService.js | getChecklist | pre_listing_checklists (doc) | No | 1 doc | N/A |
| App.jsx | loadUnreadCount (setInterval 5 min) | getMessagesForUser | No | 200×2 | clearInterval on unmount |
| Home.jsx | loadPropertiesWithFilters / loadProperties | getAllProperties / searchProperties | No | 75 | N/A |
| Feed.jsx | loadFeedData, resolvePropertyMatch, handlePostAddressSelect | getPostsBy*, getAllProperties | No | various | N/A |
| PropertyMap.jsx | (idle → getMapParcels) | Cloud Function / API (not Firestore direct) | No | N/A | removeListener |
| CompsMap.jsx | (idle → getMapParcels) | Cloud Function / API | No | N/A | removeListener |
| Dashboard.jsx | (useEffect) | getPropertiesBySeller, getPropertyById | No | 100 / 1 | N/A |
| Messages.jsx | (useEffect) | getMessagesForUser, getPropertiesBySeller | No | 200×2, 100 | N/A |
| PropertyDetail.jsx | (useEffect) | getPropertyById, getOffersByProperty, etc. | No | 1 + unbounded offers | N/A |

---

## 3) Top 3 culprits (likely driving 20k reads/min)

1. **Properties list (getAllProperties / searchProperties)**  
   - **Where:** Home.jsx (on load + filter change), Feed.jsx (address match: getAllProperties when cache empty).  
   - **Shape:** 75 docs per call; cache 10 min.  
   - **Why culprit:** Home is a top landing page; every visit or filter change = 75 reads. Feed calls getAllProperties when resolving ^address (up to 75). Multiple users or tabs = repeated full cap reads.

2. **Message unread polling (getMessagesForUser)**  
   - **Where:** App.jsx — setInterval every 5 min (already reduced from 30s).  
   - **Shape:** 2 queries × limit(200) = 400 reads per call per user.  
   - **Why culprit:** Every logged-in user triggers 400 reads every 5 min. With many concurrent users, this adds up quickly.

3. **Unbounded list queries (no limit)**  
   - **Where:** offerService (getOffersByProperty, getOffersByBuyer), pingService (seller/sender), transactionService (getTransactionsByUser), favoritesService (getUserFavoriteIds, getFavoriteCountForProperty, getFavoritesForProperty), vendorService (getVendorsByUser), profileService (getSavedSearches).  
   - **Why culprit:** PropertyDetail loads getOffersByProperty (unbounded). Dashboard/Messages/Feed load getPropertiesBySeller (now capped 100). getFavoritesForProperty does N getDoc(users) per favorite. Any of these on high-traffic pages can scale reads with data size.

---

## 4) Summary

- **No realtime listeners** — nothing to convert to one-time.
- **One polling source** — message unread (already 5 min).
- **Hot paths:** (1) properties list on Home/Feed, (2) message polling, (3) unbounded list queries.
- **Actions taken in emergency fixes:** Add limits to all unbounded queries, add feature flags + kill switch, strengthen map debounce (default on), add data layer with cache/kill for browse + detail + feed, add instrumentation by feature.

---

## 5) Manual QA checklist

- [ ] **Map drag/zoom:** Open Home → Map view. Drag and zoom; pins (listed + unlisted) update only after debounce (no rapid spam). With `VITE_ENABLE_MAP_QUERY_DEBOUNCE` default (on), expect 1s debounce and ~500m / 1200ms min interval.
- [ ] **Feed scroll:** Feed (For You, Following, Profile) loads and scrolls; pagination/limits apply; no infinite unbounded reads.
- [ ] **Property detail:** Open a property detail page; it loads and shows data. Re-open same property; second load can hit cache (when `VITE_ENABLE_CLIENT_CACHE` on). Refetch after update still works.
- [ ] **Home list:** Home list and filters load properties; changing filters refetches (cached when same filters). Kill switch: with `VITE_FIRESTORE_READ_KILL_SWITCH=true`, browse returns cached or [].
- [ ] **Messages:** Unread count updates on nav and every 5 min; no 30s polling.

---

## 6) How to verify (Firestore metrics)

- **After changes, expect:**
  - **Reads/min:** Drop from ~20k/min toward **&lt; 2k/min** (or lower) depending on traffic. Target **90%+ reduction**.
  - **By feature (dev console):** Every 60s in dev, `[metrics 60s]` logs `firestoreReads` and `readsByFeature` (map, feed, propertyDetail, propertiesBrowse, other). Use to confirm which screens cause reads.
- **Screens that should cause reads (approximate):**
  - **Map browse:** 1 “map” request per debounced bounds change (not per doc; backend/API may do its own reads).
  - **Property list (Home/Feed):** Up to 75 reads per load when cache miss (propertiesBrowse); cache 10 min.
  - **Property detail:** 1 read per property when cache miss (propertyDetail); cache 5 min when `VITE_ENABLE_CLIENT_CACHE` on.
  - **Feed:** Up to 50–100 reads per feed tab load (feed); limits apply per query.
- **Rollback:** Set `VITE_FIRESTORE_READ_KILL_SWITCH=false`, `VITE_ENABLE_MAP_QUERY_DEBOUNCE=false`, `VITE_ENABLE_CLIENT_CACHE=false`, `VITE_ENABLE_QUERY_DEDUPE=false`, `VITE_ENABLE_SAFE_LIMITS=false` to revert to prior behavior (where applicable).
