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
