# Re-architecture status — how close are we?

**Branch:** `dev/cost-architecture-refactor`  
**Last updated:** Feb 2025

---

## Summary

| Wave | Focus | Status | What's left |
|------|--------|--------|-------------|
| **1** | Firestore limits, Places session token, map debounce, parcel dedupe, properties cap | **Done** | Nothing. |
| **2** | Vercel API + Redis for ATTOM | **Done** | Set env: `ATTOM_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Enable `VITE_USE_ATTOM_CACHE=true` when ready. |
| **3** | Places/ATTOM via API only (DAL) | **Done** | Set `GOOGLE_MAPS_API_KEY` on Vercel. Enable `VITE_USE_SERVER_DATA_LAYER=true` when ready. |
| **4** | Postgres (social: feed, posts, likes, follows) | **Code done** | Run migration on Neon, set `DATABASE_URL`, (optional) backfill, enable `VITE_USE_SOCIAL_READS=true`. |
| **5** | Meilisearch for map pins | **Not started** | New infra + API route + client switch. |
| **6** | R2 proxy for media | **Not started** | New infra + API route + client switch. |

**Bottom line:** Waves 1–4 are implemented. Wave 4 is the only one that needs **setup** (Neon schema + env). Waves 5 and 6 are optional for “re-arch done” and can follow later.

---

## Wave 4 — finish in 3 steps

1. **Run schema on Neon**  
   - In Neon (dashboard or Cursor extension): run the contents of `scripts/migrations/001_social_schema.sql` once per branch/project.

2. **Set `DATABASE_URL`**  
   - Local: add to `.env`: `DATABASE_URL=postgresql://...` (from Neon connection details).  
   - Vercel: add `DATABASE_URL` in project Environment Variables.

3. **Enable social reads**  
   - In Vercel (and/or local `.env`): set `VITE_USE_SOCIAL_READS=true`.  
   - If you want address/Places via API too: `VITE_USE_SERVER_DATA_LAYER=true`.  
   - Deploy. Feed will read from Postgres; writes still go to Firestore and dual-write to Postgres.

**Backfill:** Not required if you're starting fresh. The script `scripts/backfillSocialToPostgres.js` exists only if you ever need to copy existing Firestore social data into Postgres.

---

## Waves 5 & 6 — when to do them

- **Wave 5 (Meilisearch):** Do when you want map pins to come from a search index instead of `getAllProperties` + client filter. Reduces Firestore property reads for map browse.  
- **Wave 6 (R2):** Do when you want uploads to go to R2 instead of Firebase Storage.  
Both are independent and can be done after Wave 4 is live and stable.

---

## Env checklist (to turn everything on)

| Env var | Where | Purpose |
|---------|--------|--------|
| `DATABASE_URL` | Vercel + local | Neon Postgres (Wave 4). |
| `ATTOM_API_KEY` | Vercel + local | ATTOM API (Wave 2). |
| `UPSTASH_REDIS_REST_URL` | Vercel + local | Redis for ATTOM cache (Wave 2). |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel + local | Redis (Wave 2). |
| `GOOGLE_MAPS_API_KEY` | Vercel (server) | Places proxy (Wave 3). |
| `VITE_USE_ATTOM_CACHE` | Vercel + local | Use Vercel ATTOM API (Wave 2). |
| `VITE_USE_SERVER_DATA_LAYER` | Vercel + local | Use API for Places (Wave 3) and gate social API (Wave 4). |
| `VITE_USE_SOCIAL_READS` | Vercel + local | Feed reads from Postgres (Wave 4). |
