# Phase 3 — Target Architecture (Destination State)

**Branch:** `dev/cost-architecture-refactor`  
**Goal:** A scalable, cost-predictable stack that replaces Firebase-heavy hot paths while keeping the app stable and incrementally migrable.

---

## 1) Recommended End-State Stack

| Layer | Choice | Alternative |
|-------|--------|--------------|
| **System of record (DB)** | **Postgres — Neon** | Supabase (if you want Postgres + optional Auth/Realtime in one vendor) |
| **Search / index for map browse** | **Meilisearch** | Algolia (better DX, higher cost at scale) |
| **Object storage (media/docs)** | **Cloudflare R2** | S3 + CloudFront (similar; R2 has no egress fee) |
| **Cache / rate limit / dedupe** | **Upstash Redis** | Redis on Railway/Fly, or Vercel KV (Upstash-backed) |
| **Background jobs** | **Vercel Cron + queue** | Inngest, Trigger.dev, or a small worker on Fly/Railway |
| **Auth** | **Firebase Auth (short-term)** | Migrate later to Supabase Auth, Clerk, or Auth0 |

---

## 2) Justification for Each Component

### Postgres (Neon)

- **Why a relational DB:** Firestore’s cost comes from read/write volume and lack of indexed query flexibility. Postgres gives you one source of truth, ACID transactions, and queries (filters, pagination, joins) without “read 1000 docs and filter client-side.”
- **Why Neon:** Serverless Postgres with branching, Vercel-friendly, pay-per-compute + storage. Free tier is enough for beta; scaling is predictable. You use it purely as the system of record without pulling in extra services (unlike Supabase, which bundles Auth/Realtime/Storage).
- **When to consider Supabase instead:** If you want one vendor for DB + optional Auth/Realtime and are okay with their Storage (or still use R2 for media), Supabase is a good alternative.

### Search / index (Meilisearch)

- **Why a search index for map browse:** Today, map pins come from ATTOM (unlisted) + Firestore “get all properties then filter.” That doesn’t scale. A geo-capable search index holds **listed properties** (and optionally denormalized fields) so “pins in this viewport” is a single indexed query instead of “read 1000 properties and filter by bounds.”
- **Why Meilisearch:** Open-source, good geo/filter support, typo tolerance, simple API. You can self-host or use Meilisearch Cloud; pricing is more predictable than Algolia for a small/medium dataset. Fits “browse by map + filters” well.
- **Why not Algolia:** Better polish and DX, but cost grows with records and queries; for a beta with cost sensitivity, Meilisearch is the safer pick.

### Object storage (Cloudflare R2)

- **Why move off Firebase Storage:** Storage + egress can add up; R2 has **no egress fee** to the internet (and to Cloudflare’s network). Same S3-compatible API, so migration is straightforward with a thin proxy.
- **Why R2:** No egress cost, S3-compatible, good for media and documents. You keep Firebase Storage temporarily and proxy new uploads to R2 (or switch reads to R2 URLs) behind a feature flag.

### Cache / rate limit / dedupe (Upstash Redis)

- **Why Redis:** ATTOM cache today lives in Firestore (expensive). Moving it to Redis gives you fast, cheap cache for tiles, address resolution, and property snapshots. Same Redis can back rate limiting and request deduplication (singleflight) in API routes.
- **Why Upstash:** Serverless Redis, pay-per-request, works well with Vercel/serverless. No long-lived connections; ideal for edge/function environments.

### Background jobs (Vercel Cron + queue)

- **Why background jobs:** Reindexing Meilisearch when properties change, cleaning old cache entries, sending notifications, or syncing data between systems should not run on the critical path of a user request.
- **Why Vercel Cron:** You’re already on Vercel; Cron is simple for “run this on a schedule.” For job queues (e.g. “process this when a property is created”), you can start with a Cron that polls a “pending jobs” table in Postgres, or add Inngest/Trigger.dev later.

### Auth (Firebase Auth short-term)

- **Why keep it for now:** Auth is sensitive and touches every protected route. Migrating auth is a separate, high-risk change. Keeping Firebase Auth lets you move DB and storage first and stabilize cost without a big-bang auth cutover.
- **Later:** Once Postgres + R2 + search are stable, you can evaluate Supabase Auth, Clerk, or Auth0 and migrate in a dedicated phase.

---

## 3) Text-Based Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Vite + React)                           │
│  Browser: SPA on Vercel (static + rewrites to /index.html)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ HTTPS (no direct Firebase/ATTOM/Places from client
                    │       once DAL is enforced; all via your API)
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Vercel Serverless)                        │
│  • Next.js API Routes or Vercel Serverless Functions                         │
│  • Or: keep Firebase HTTP Callable + add new Vercel API routes for new DB   │
│  • Auth: validate Firebase ID token (or future provider); attach user to ctx  │
└─────────────────────────────────────────────────────────────────────────────┘
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Postgres   │  │ Meilisearch  │  │  Upstash      │  │  Cloudflare   │
│   (Neon)     │  │ (search idx) │  │  Redis        │  │  R2           │
│              │  │              │  │               │  │               │
│ • users      │  │ • properties │  │ • ATTOM       │  │ • media       │
│ • properties │  │   (geo +     │  │   cache       │  │ • docs        │
│ • posts      │  │   filters)   │  │ • rate limit  │  │ (no egress    │
│ • offers     │  │ • map pins   │  │ • dedupe      │  │  fee)         │
│ • etc.       │  │   viewport   │  │   keys        │  │               │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        │                 │                 │  (ATTOM cache moved off
        │                 │                 │   Firestore → Redis)
        │                 │                 ▼
        │                 │          ┌──────────────┐
        │                 │          │ ATTOM API     │
        │                 │          │ (server-only) │
        │                 │          └──────────────┘
        │                 │
        │                 │          ┌──────────────┐
        │                 │          │ Google       │
        │                 │          │ Places/      │
        │                 │          │ Geocoding    │
        │                 │          │ (server/     │
        │                 │          │  proxy)       │
        │                 │          └──────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKGROUND                                                                  │
│  • Vercel Cron: reindex Meilisearch, cache cleanup, etc.                     │
│  • Optional queue: Postgres “jobs” table or Inngest/Trigger.dev              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TEMPORARILY REMAIN (until replaced and validated)                           │
│  • Firebase Auth (identity; tokens validated in API layer)                   │
│  • Firestore (legacy reads during dual-write / shadow-read phases)           │
│  • Firebase Storage (legacy URLs; new uploads can go to R2 behind flag)      │
│  • Firebase Cloud Functions (ATTOM endpoints until moved to Vercel + Redis)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data flow (target):**

1. **Map browse:** Client calls your API with viewport bounds → API queries **Meilisearch** (geo + filters) for listed properties; optionally **ATTOM** (via your server) for unlisted parcels, with **Redis** cache. No client Firestore for pins.
2. **Property detail:** API reads **Postgres** (and optionally Firestore during migration). ATTOM snapshot from **Redis** or ATTOM API.
3. **Feed:** API reads **Postgres** (posts, likes, follows). Paginated, indexed.
4. **Media:** Upload goes to **R2** (or Firebase behind flag); response returns R2 URL. Download is from R2 (or legacy Firebase URL).
5. **Auth:** Client still signs in with **Firebase Auth**; API validates token and loads user from **Postgres** (or Firestore during migration).

---

## 4) What Leaves Firebase, What Stays, What Is Introduced First

### What leaves Firebase (by domain)

| Domain | Leaves Firestore | Leaves Storage | Leaves Functions |
|--------|-------------------|----------------|-------------------|
| **Properties (list/search/map pins)** | Yes → Postgres + Meilisearch | — | ATTOM logic → Vercel + Redis cache |
| **Posts / comments / likes / follows** | Yes → Postgres | Post images → R2 | — |
| **Offers / PSA drafts / transactions** | Yes → Postgres | Doc attachments → R2 | — |
| **Users (profile, searchUsers)** | Yes → Postgres | Avatar → R2 | — |
| **Favorites, pings, messages, feedback** | Yes → Postgres | — | — |
| **Pre-listing checklists, listing progress** | Yes → Postgres | — | — |
| **Profiles (sale/purchase/saved searches), vendors** | Yes → Postgres | — | — |
| **ATTOM cache** | Yes → Redis (tiles, address, snapshot) | — | Reads/writes move to Redis; ATTOM calls stay server-side |
| **Media/docs (all uploads)** | — | Yes → R2 | — |

### What stays temporarily

| Component | Why it stays | Until |
|-----------|---------------|--------|
| **Firebase Auth** | Identity; low cost; risky to change first | Optional Phase 7 (auth migration) |
| **Firestore** | Legacy data; dual-write and shadow-read during migration | Each domain cut over to Postgres and validated |
| **Firebase Storage** | Existing URLs; some upload paths | R2 proxy + dual-write; then switch reads to R2 and stop writing to Storage |
| **Cloud Functions (ATTOM)** | Existing HTTP endpoints | ATTOM logic moved to Vercel API + Redis; then deprecate Functions |

### What is introduced first (order of operations)

| Order | Introduced | Purpose |
|-------|------------|--------|
| **1** | **Upstash Redis** | ATTOM cache (tiles, address, snapshot). Move cache off Firestore first for immediate read/write and cost reduction. |
| **2** | **Vercel API routes (or serverless)** | Thin API that uses Redis for ATTOM cache and can later add Postgres/Meilisearch. Enforce “no client ATTOM/Places” by routing through this API. |
| **3** | **Neon Postgres** | One bounded domain first (e.g. **social: posts, comments, likes, follows**). Schema + dual-write + shadow-read, then switch reads. |
| **4** | **Meilisearch** | Index listed properties (from Postgres or Firestore sync). Map browse reads from Meilisearch (viewport query) instead of “get all properties.” |
| **5** | **Cloudflare R2 + proxy** | Upload proxy to R2; new uploads write to R2 (and optionally Firebase during dual-write). Serve URLs from R2; eventually migrate legacy Storage URLs or redirect. |
| **6** | **Postgres for remaining domains** | Offers, transactions, properties (CRUD), users, favorites, etc. Migrate domain by domain with dual-write and shadow-read. |
| **7** | **Firebase Auth migration (optional)** | Replace with Supabase Auth / Clerk / Auth0 only after DB and storage are stable. |

---

## 5) Summary

- **System of record:** Postgres (Neon) for structured data; Firestore is phased out per domain.
- **Map browse:** Meilisearch for listed properties (geo + filters); ATTOM for unlisted, with cache in Redis.
- **Media/docs:** R2; Firebase Storage phased out via proxy and dual-write.
- **Cache/dedupe/rate limit:** Upstash Redis; ATTOM cache moves off Firestore first.
- **Jobs:** Vercel Cron (and optional queue) for reindex, cleanup, and async work.
- **Auth:** Firebase Auth kept short-term; migrate later if desired.

Introducing **Redis + Vercel API** first gives you a place to centralize ATTOM and eventually all server-side data access, without a big-bang rewrite. Then add **Postgres for one domain (e.g. social)**, then **Meilisearch**, then **R2**, then the rest of Postgres.
