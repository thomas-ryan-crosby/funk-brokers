# Full migration to Postgres (Neon)

**Goal:** All application data lives in Postgres. Firebase is used only for Auth (and optionally Storage). No dual-write, no feature flags per domain—implement on Postgres and remove Firestore usage. No data migration from Firebase (database will be cleared).

**Branch:** `dev/cost-architecture-refactor`  
**Approach:** Schema migration → API routes → client calls API only. Fix breakage as we go.

---

## Current state

| Domain | Firestore collection(s) | Postgres | Notes |
|--------|-------------------------|----------|--------|
| **Social** | posts, userLikes, userFollowing, comments | ✅ Done (Wave 4) | `VITE_USE_SOCIAL_READS=true` |
| **Properties** | properties | ❌ | Core domain; most other data references propertyId |
| **Favorites** | favorites | ❌ | userId + propertyId |
| **Offers** | offers | ❌ | propertyId, buyerId, sellerId |
| **Messages** | messages | ❌ | recipientId, senderId |
| **Users (profiles)** | users | ❌ | Firebase Auth stays; `users` = profile (name, publicUsername, etc.) |
| **Profiles (sale/purchase)** | saleProfiles, purchaseProfiles, savedSearches | ❌ | profileService |
| **Transactions** | transactions | ❌ | propertyId, buyerId, sellerId |
| **Pings** | pings | ❌ | propertyId, senderId |
| **Vendors** | vendors | ❌ | sellerId / propertyId |
| **PSA drafts** | psaDrafts | ❌ | userId |
| **Feedback** | feedback | ❌ | Low volume |
| **Pre-listing checklists** | preListingChecklists | ❌ | propertyId |
| **Listing progress** | listingProgress | ❌ | propertyId |

**Out of scope (for this plan):** Firebase Auth (stay on Auth); Firebase Storage (optional Wave 6 R2 later).

---

## Recommended order

Dependencies and impact suggest this order:

1. **Properties** — Core entity; offers, favorites, transactions, pings, vendors, listing progress reference it.
2. **Users (profiles)** — Sync from Auth; needed for display names and public usernames. Can extend existing `users` table from Wave 4.
3. **Favorites** — Simple; userId + propertyId.
4. **Offers** — Property + buyer/seller; used in listing flow.
5. **Messages** — Standalone; high read volume if not capped.
6. **Transactions** — Deal flow.
7. **Pings** — Property + sender.
8. **Vendors** — Seller-scoped.
9. **Profiles (sale/purchase/saved searches)** — User preferences.
10. **PSA drafts** — User drafts.
11. **Pre-listing checklists** — Per property.
12. **Listing progress** — Per property.
13. **Feedback** — Low priority.

---

## Phase 1: Properties

**Why first:** Largest read cost and required for favorites, offers, transactions, etc.

### 1.1 Schema (Neon)

- New migration: `002_properties_schema.sql`
- Table `properties`: id (uuid/text), seller_id, address, city, state, zip_code, latitude, longitude, attom_id, property_type, bedrooms, bathrooms, square_feet, price, funk_estimate, photos (jsonb), features (jsonb), status, available_for_sale, accepting_offers, accepting_communications, archived, created_at, updated_at. Match Firestore field names (camelCase → snake_case).
- Indexes: seller_id, status, created_at desc, (latitude, longitude) for map, archived.

### 1.2 API routes

- `GET /api/properties` — list (query: limit, sellerId, listedStatus, etc.); proxy to Postgres.
- `GET /api/properties/:id` — by id.
- `POST /api/properties` — create (claim + full create); return id.
- `PATCH /api/properties/:id` — update.
- `DELETE /api/properties/:id` — delete (or soft-delete).

### 1.3 Client

- New `propertyApiService.js` or inline in propertyService: call API only. No flags. (Removed) `VITE_USE_PROPERTIES_POSTGRES` (or single “use Postgres for all” flag).
- New `propertyApiService.js`: getAllProperties, searchProperties, getPropertyById, createProperty, claimProperty, updateProperty, deleteProperty → call API.
- In `propertyService.js`: when flag true, use API; else Firestore (current behavior).

(No backfill; DB will be cleared.)

- (Removed) Script: `scripts/backfillPropertiesToPostgres.js` — read all from Firestore, insert into Postgres (id = Firestore doc id). Run once before cutover.

---

## Phase 2: Users (profiles)

- Extend `users` table from 001_social_schema if needed (Wave 4 may already have id, name, public_username).
- Sync on login/signup: when Firebase Auth user is created/updated, upsert into Postgres `users`.
- API: `GET /api/users/:id`, `PUT /api/users/:id` (profile update).
- Client: authService / profile update call API only; remove Firestore users collection usage.

---

## Phase 3: Favorites

- Schema: `favorites` (id, user_id, property_id, created_at).
- API: GET list, POST add, DELETE remove.
- Client: favoritesService calls API only.

---

## Phase 4: Offers

- Schema: `offers` (id, property_id, buyer_id, seller_id, amount, status, message, created_at, updated_at, etc.).
- API: list by property, list by user, create, update, get by id.
- Client: offerService calls API only.

---

## Phase 5: Messages

- Schema: `messages` (id, sender_id, recipient_id, body, read, created_at).
- API: list by user (inbox/sent), create, mark read.
- Client: messageService calls API only.

---

## Phases 6–13 (summary)

- **Transactions:** table + API (list by property/user, create, update) + transactionService.
- **Pings:** table + API + pingService.
- **Vendors:** table + API + vendorService.
- **Profiles (sale/purchase/saved searches):** tables + API + profileService.
- **PSA drafts:** table + API + psaDraftService.
- **Pre-listing checklists:** table + API + preListingChecklistService.
- **Listing progress:** table + API + listingProgressService.
- **Feedback:** table + API + feedbackService.

Same pattern: migration SQL → API routes → client calls API only (remove Firestore). No flags, no backfill.

---

## Flags and cutover

- Option A: One flag per domain (e.g. `VITE_USE_PROPERTIES_POSTGRES`, `VITE_USE_FAVORITES_POSTGRES`) for gradual rollout.
- Option B: Single `VITE_USE_POSTGRES_FOR_ALL` that turns on Postgres for every migrated domain (simpler once all are implemented).

Recommendation: Start with per-domain flags (Option A) for properties and favorites; add a global “all Postgres” flag later if desired.

---

## Success criteria

- All reads/writes for properties, favorites, offers, messages, users (profile), transactions, pings, vendors, profiles, drafts, checklists, listing progress, feedback go through Postgres when flags are on.
- Firebase used only for: Auth (login/signup), optional Storage (until R2).
- Backfill scripts exist and are run once per domain before enabling the flag.
- Docs updated (REARCH_STATUS, IMPLEMENTATION_PLAN) to reflect “full Postgres” state.

---

## Next step

Implement **Phase 1 (Properties)** first: add `002_properties_schema.sql`, `/api/properties/*` routes, then replace `propertyService.js` Firestore usage with API calls.
