# Firebase Cost Projection PRD (Fundraise)

**Purpose:** Answer whether recent spend is normal for 2 users and a few properties, and project Firebase (Firestore + Storage + Cloud Functions) expected spend as the platform scales for budget/raise planning.

---

## 1. Is This Spend Normal? (Feb 1–2, 2026)

**Short answer: No.** $27.79 over two days with **2 users** and **a few properties** is not normal. It indicates read-heavy patterns that have since been partly addressed.

### What drove the spike

- **Cloud Firestore Read Ops** accounted for the largest cost increase (+$13.10, ~95% vs prior period). App Engine line item is where Firestore usage is billed in this project.
- **Root causes (with only 2 users):**
  1. **Unbounded queries (now mitigated):** Every Home load, Dashboard load (with favorites), Feed address resolution, and Feedback page load was reading the **entire** properties or feedback collection. With even a few hundred docs, a handful of page loads and tab switches can generate thousands of reads.
  2. **ATTOM cache in Firestore:** Every map tile request (`getMapParcels`), address resolution (`resolveAddress`), and property snapshot (`getPropertySnapshot`) does **at least one Firestore read** (and often a write on cache miss). Heavy Browse/map or Property Detail usage by 2 active users can still produce hundreds of reads.
  3. **@-mention search:** Each keystroke after `@` in the Feed composer triggered a search that read up to 100 user docs. Fast typing = many 100-read bursts.

### What we changed (Tier 1)

- **Feedback list:** Query now uses `limit(100)` — reads per load capped at 100 instead of all feedback docs.
- **Properties:** `getAllProperties` and `searchProperties` use `orderBy('createdAt','desc')` + `limit(1000)` — property-related reads capped per call (Home, Dashboard, Feed).
- **@-mention:** Search is debounced (300 ms) and only runs when the query has ≥ 2 characters — fewer 100-read bursts per session.

**Expectation:** After these changes, Firestore read volume for the same 2-user, few-property usage should drop meaningfully. Remaining cost will come from ATTOM cache reads (map/address/snapshot), other app reads (posts, offers, messages, etc.), and Cloud Functions compute. We recommend monitoring the next 1–2 billing periods and adding budget alerts.

---

## 2. Firebase Services in Use

| Service | Use in product |
|--------|------------------|
| **Cloud Firestore** | All app data: users, properties, posts, comments, likes, follows, offers, drafts, transactions, messages, feedback, favorites; **plus** ATTOM cache collections (`map_search_snapshot`, `address_attom_map`, `property_snapshots`). |
| **Firebase Storage** | Feed post images, profile avatars, verification docs (GetVerified, PreListingChecklist, BuyerVerificationChecklist), property docs (ListProperty/EditProperty). |
| **Cloud Functions (App Engine)** | HTTPS endpoints for: getMapParcels, resolveAddress, getPropertySnapshot (ATTOM-backed); Persona webhooks; other server-side logic. Billing appears under App Engine; compute + outbound traffic are separate line items from Firestore. |

---

## 3. Pricing Reference (Approximate)

- **Firestore (Standard):** ~$0.03 per 100,000 document reads; ~$0.09 per 100,000 writes; storage ~$0.18/GB/month (region-dependent).
- **Firebase Storage:** ~$0.026/GB/month stored; egress and operations additional.
- **Cloud Functions / App Engine:** Compute and egress per usage; free tier applies to modest traffic.

(Exact numbers: [Firestore pricing](https://firebase.google.com/docs/firestore/pricing), [Storage pricing](https://firebase.google.com/pricing).)

---

## 4. Scaling Assumptions

Used for projections below:

- **MAU (monthly active users):** primary scaling axis.
- **Sessions per MAU:** 8–12 per month (beta/early: higher engagement; growth: moderate).
- **Reads per session (after Tier 1):** 2,000–4,000 (Home/Dashboard/Feed/Property Detail/messages; capped property and feedback queries; ATTOM cache reads for map/address/snapshot).
- **Writes per session:** 50–150 (posts, likes, comments, follows, profile updates, offers, messages, feedback).
- **Properties:** Grows with supply side; assume 50–500 listed properties in next 12 months; property-related reads capped at 1,000 per query (Tier 1).
- **Storage:** ~50–200 MB per active user (avatars, post images, verification and property docs) over time; growth as uploads increase.

---

## 5. Projected Monthly Firebase Spend (Conservative)

*All figures in USD, monthly, and rounded for planning. Actuals will vary with usage and region.*

| Stage | MAU | Properties | Firestore (reads/writes/storage) | Firebase Storage | Cloud Functions / Compute | **Total (approx)** |
|-------|-----|------------|-----------------------------------|------------------|---------------------------|--------------------|
| **Current (post–Tier 1)** | 2–5 | Few | $5–15 | &lt;$1 | $2–5 | **$8–22** |
| **Beta** | 10–25 | 10–50 | $15–40 | $1–3 | $5–15 | **$22–58** |
| **Launch (Y1)** | 50–100 | 50–200 | $40–100 | $3–10 | $15–40 | **$58–150** |
| **Growth** | 200–500 | 200–1,000 | $100–280 | $10–30 | $40–100 | **$150–410** |
| **Scale** | 1,000+ | 1,000+ | $280–600+ | $30–80+ | $100–250+ | **$410–930+** |

### Notes on projections

- **Firestore** dominates at scale because of reads (sessions × reads per session) and ATTOM cache reads (map/address/snapshot). Tier 1 caps the worst unbounded patterns; Tier 2 (client-side caching) would further reduce reads per session.
- **Storage** grows with user-generated content (images, documents); numbers assume moderate upload behavior.
- **Compute** (Cloud Functions / App Engine) grows with request volume (map tiles, address resolution, webhooks); cold starts and multiple instances can add cost.
- Ranges reflect “low activity” to “high activity” within each stage; use mid-range or high end for budget and raise planning.

---

## 6. Annual Run-Rate Ranges (for Raise / Budget)

| Scenario | MAU range | Annual Firebase (approx) |
|----------|-----------|---------------------------|
| **Lean (current + beta)** | 2–25 | **$260–700** |
| **Year 1 (launch)** | 50–100 | **$700–1,800** |
| **Growth** | 200–500 | **$1,800–5,000** |
| **Scale** | 1,000+ | **$5,000–11,000+** |

These are **infrastructure-only** (Firebase). They do not include ATTOM API, Persona, email/SMS, or other third-party services.

---

## 7. Cost Control and Next Steps

- **Done:** Tier 1 query limits and debounce (feedback, properties, @-mention). Monitor next 1–2 billing periods to confirm read reduction.
- **Recommended:** Budget alerts (e.g. $50, $100, $200/month) and quarterly review of Firestore vs Storage vs Compute breakdown.
- **Next (Tier 2):** Client-side caching for ATTOM-backed data and for properties list where used for resolution/favorites; reduces repeated reads within a session.
- **Later (Tier 3):** Move ATTOM cache off Firestore (e.g. Redis/Memorystore), pagination and indexed queries for properties, denormalize or batch favorites/user details — for scale and further cost control.

---

## 8. Summary for Fundraise

- **Feb 1–2 spend was not normal** for 2 users and a few properties; it was driven by unbounded Firestore reads and ATTOM cache usage. **Tier 1 mitigations are in place**; expect lower read volume and spend for similar usage.
- **Firebase cost scales with MAU and usage.** Conservative monthly ranges: ~\$8–22 (current), ~\$22–58 (beta), ~\$58–150 (launch), ~\$150–410 (growth), ~\$410–930+ (scale). Annual run-rates for raise planning: **~\$260–700 (lean/beta)** to **~\$5k–11k+ (scale)**.
- **We have a clear cost structure**, identified drivers (Firestore reads first, then compute, then storage), and a roadmap (Tier 2/3) to keep unit costs under control as we grow.
