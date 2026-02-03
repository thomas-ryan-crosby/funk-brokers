# Firebase Storage / Budget Analysis (No Code Changes)

## Question
Did changes made to save on ATTOM API calls increase Firebase usage and contribute to exhausting the budget?

## Distinction: Firestore vs Firebase Storage

- **Firebase Storage** = file/blob storage (images, PDFs, uploads). Used by: Feed post images, Profile avatars/government ID, GetVerified documents, ListProperty/EditProperty property docs, PreListingChecklist/BuyerVerificationChecklist uploads, UserProfile avatars.
- **Firestore** = document database (collections/documents). Used by: all app data (properties, users, posts, offers, messages, **and ATTOM cache collections**).

## ATTOM “Save on API Calls” Changes

The codebase **does** implement caching to reduce ATTOM API calls:

- **Firestore collections used for ATTOM cache:**
  - `map_search_snapshot` — tile cache (parcel lists per map tile), TTL 30 min.
  - `address_attom_map` — address → attomId/parcel, TTL 120 days.
  - `property_snapshots` — **full ATTOM API response per attomId**, TTL 30 days (with section-level TTLs).

- **Impact:** Every cache **write** is a Firestore document write; every cache **read** is a Firestore document read. The **size** of stored data grows with:
  - Number of distinct map tiles viewed (each tile = one doc in `map_search_snapshot`).
  - Number of addresses resolved (each = one doc in `address_attom_map`).
  - Number of property snapshots fetched (each = one doc in `property_snapshots`; **these store the full ATTOM payload** and can be large).

So: **saving on ATTOM API calls increases Firestore usage** (reads, writes, and stored document size). It does **not** write to **Firebase Storage** (file storage).

## Is It True That These Changes Increased “Firebase Storage”?

- **If “budget” = Firestore (reads/writes/storage):** **Yes.** ATTOM caching can be a significant contributor:
  - More map usage → more tiles and snapshots cached → more Firestore writes and stored data.
  - `property_snapshots` in particular can be large (full API response per property).
  - Cache reads on every relevant request add Firestore reads.

- **If “budget” = Firebase Storage (GB stored / download bandwidth):** **No.** ATTOM caching does not use Firebase Storage at all. Exhausting the **Storage** budget would come from:
  - User uploads: post images (Feed), property docs, verification docs, government IDs, avatars, etc.
  - No code path in the ATTOM flow writes to Firebase Storage.

## Other Contributors to High Usage

- **Firestore:** All app features (posts, comments, likes, follows, feedback, properties, offers, messages, user profiles, favorites, etc.) plus the three ATTOM cache collections above.
- **Firebase Storage:** Any feature that uploads files (see list above). A spike in beta testers uploading images/documents can quickly increase Storage usage.

## Summary

- **ATTOM “save on API calls” = more Firestore use** (reads, writes, doc size). It does **not** increase **Firebase Storage** (file storage).
- If the budget you hit is **Firestore**, then ATTOM caching can plausibly have contributed, especially with heavy map/property-detail usage and large `property_snapshots` docs.
- If the budget you hit is **Firebase Storage**, then ATTOM caching is not the cause; look at upload-heavy features (Feed images, verification docs, property docs, etc.) and usage patterns (e.g. many beta testers uploading).

No code changes were made in this analysis.

---

## Billing Data (Feb 1–2, 2026)

**Summary from billing:**  
$27.79 spent Feb 1–2, 2026 (99% increase vs Jan 30–31). Top charge: **App Engine** at $27.79, but the **underlying driver** is:

- **SKU: Cloud Firestore Read Ops** — **+$13.10 (+95%)** vs prior period.

So the cost spike is **Firestore reads**, not Firebase Storage (file storage) and not primarily compute. The “App Engine” line is where Firestore usage is billed in this project; the SKU breakdown shows **reads** are what increased.

---

## What This Means

1. **Firestore reads are the cost driver.**  
   The ~95% increase in Firestore Read Ops directly explains most of the extra cost. Anything that does more document reads will increase this SKU.

2. **ATTOM caching fits this pattern.**  
   Each map/address/snapshot request does **at least one Firestore read** (cache lookup):
   - **getMapParcels:** 1 read per request to check `map_search_snapshot` (and 1 write on miss).
   - **resolveAddress:** 1 read to check `address_attom_map`, and on miss more reads/writes plus `property_snapshots`.
   - **getPropertySnapshot:** 1 read (and possibly 1 write) per request to `property_snapshots`.  

   So more map usage, address resolution, or property-detail views → more Firestore reads. Caching **reduces ATTOM API calls** but **trades them for Firestore reads** (and some writes). If Feb 1–2 had more beta traffic on Browse/map, address resolution, or Property Detail, that would show up as more reads and align with the +95% read growth.

3. **Other app usage also adds reads.**  
   Every Feed load, post list, property list, message list, profile load, feedback list, etc. does Firestore reads. A general increase in users or sessions (e.g. beta push, demos, or more returning users) would also raise read volume. So the spike can be:
   - **ATTOM-related:** more map tiles, address lookups, and property snapshots (each doing 1+ cache read).
   - **Rest of app:** more feed, properties, messages, feedback, profiles, etc.

4. **Why reads dominate cost.**  
   Firestore pricing is per read/write; at scale, **read volume** often dominates because:
   - Cache lookups are read-heavy (1 read per request; writes only on cache miss).
   - List/feed queries read many documents per page.
   - Repeated views of the same data still count as new reads unless you add a separate read cache (e.g. in-memory or CDN), which the app does not do for Firestore.

---

## Conclusion

- **Billing confirms:** The Feb 1–2 spike is **Cloud Firestore Read Ops** (+95%), not Storage and not mainly compute.
- **ATTOM caching is a plausible contributor:** It turns ATTOM API calls into Firestore reads (and some writes). More usage of map, address resolution, or Property Detail directly increases read count.
- **General traffic** (more users/sessions, more Feed/Browse/Property Detail) also increases reads from other collections.
- To reduce cost you’d look at: lowering read volume (e.g. cache TTLs, fewer queries per page, or moving ATTOM cache to a cheaper store), or reducing traffic to read-heavy features. This doc is analysis only; no code changes.
