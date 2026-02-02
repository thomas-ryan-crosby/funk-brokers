# Deal Center: LOIs Sent & Counters Received — Product Requirements

## Purpose

Define how the **Deal Center** should surface **LOIs sent** (by the buyer) and **counters received** (by the buyer when the seller counters, or by the seller when the buyer counters) so that labels, tabs, and data sources behave correctly and predictably.

---

## Goals

1. **Correct badges** — Each offer row shows the right event label (LOI sent, Offer sent, Counter sent, Counter received, LOI/Offer received) from the **current user’s perspective**.
2. **Correct data sources** — “Deals on your properties” = offers where the user is the **seller** (received). “LOIs & offers sent” = offers where the user is the **buyer** (sent + counters back to them).
3. **Counters visible to both sides** — Seller sees counters they sent; buyer sees counters they received (and vice versa), with correct labels.

---

## Data Model (Reference)

- **Offer document**
  - `buyerId` — The buyer (party making/considering the purchase). Stays the same through a counter chain.
  - `createdBy` — User ID who created this document (initial offer = buyer; counter = whoever sent the counter).
  - `propertyId` — Property the offer is for.
  - `counterToOfferId` — If this offer is a counter, the ID of the offer it counters.
  - `counteredByOfferId` — Set on the **original** offer when it is countered (points to the counter offer).
  - `offerType` — `'loi'` or undefined (PSA-style offer).

- **Received tab** (“Deals on your properties”): `getOffersByProperty(propertyId)` for each of the user’s properties. User = **seller**.
- **Sent tab** (“LOIs & offers sent”): `getOffersByBuyer(user.uid)`. User = **buyer**. Includes both offers the buyer sent and counters the seller sent back (same `buyerId`).

---

## Required Behavior

### 1. Received tab (user is seller — “Deals on your properties”)

| Offer type | createdBy | counterToOfferId | counteredByOfferId | Badge (seller POV) |
|------------|-----------|------------------|--------------------|--------------------|
| Buyer’s initial LOI/offer | Buyer | — | — | **LOI received** / **Offer received** |
| Buyer’s counter (to seller’s counter) | Buyer | set | — | **Counter received** |
| Seller’s counter (seller sent it) | Seller | set | — | **Counter sent** (seller sees their own counter) |
| Original offer that was countered | — | — | set | **Counter received** (seller sees “you received a counter” = buyer countered) |

Logic:

- If this offer is a counter and **I** created it → **Counter sent**.
- If this offer is a counter and the **other party** created it → **Counter received**.
- If this offer has **counteredByOfferId** (it’s the original that was countered) → **Counter received**.
- Else → **LOI received** or **Offer received** (by type).

### 2. Sent tab (user is buyer — “LOIs & offers sent”)

| Offer type | createdBy | counterToOfferId | counteredByOfferId | Badge (buyer POV) |
|------------|-----------|------------------|--------------------|--------------------|
| Buyer’s initial LOI/offer | Buyer | — | — | **LOI sent** / **Offer sent** |
| Seller’s counter (back to buyer) | Seller | set | — | **Counter received** |
| Buyer’s counter (buyer’s counter to seller) | Buyer | set | — | **Counter sent** |
| Buyer’s original that was countered | — | — | set | **Counter received** (buyer sees “seller countered you”) |

Logic:

- If this offer is a counter and **I** created it → **Counter sent**.
- If this offer is a counter and the **other party** created it → **Counter received**. *(This case was missing and caused counters from the seller to show as “LOI sent”.)*
- If this offer has **counteredByOfferId** (my original was countered) → **Counter received**.
- Else → **LOI sent** or **Offer sent** (by type).

### 3. Summary

- **Counter document** (has `counterToOfferId`):  
  - If `createdBy === currentUser` → “Counter sent”.  
  - If `createdBy !== currentUser` → “Counter received”.
- **Original document** that was countered (has `counteredByOfferId`):  
  - Always “Counter received” (the other party sent a counter).
- **Initial offer** (no counter link):  
  - Received tab → “LOI/Offer received”.  
  - Sent tab → “LOI/Offer sent”.

---

## Implementation Checklist

- [ ] **Received tab:** Badge logic uses: counter + createdBy === uid → Counter sent; counter + createdBy !== uid → Counter received; counteredByOfferId → Counter received; else LOI/Offer received.
- [ ] **Sent tab:** Badge logic uses: counter + createdBy === uid → Counter sent; **counter + createdBy !== uid → Counter received**; counteredByOfferId → Counter received; else LOI/Offer sent.
- [ ] **Timestamps:** All badges show creation timestamp (e.g. “LOI sent · Feb 1, 2026, 6:44 PM”).
- [ ] **Data:** Sent tab is `getOffersByBuyer(uid)` (no extra filter); Received tab is `getOffersByProperty(propertyId)` per seller property.
- [ ] **Grouping:** Sent tab groups by `propertyId` and sorts by latest offer date; each row is one offer with the correct badge.

---

## Out of Scope (this PRD)

- Notifications or email when a counter is received.
- Multi-step counter chains (beyond “original + one counter”); behavior should still be consistent by applying the same rules per document.
- Changing Firestore schema (`buyerId` / `createdBy` / `counterToOfferId` / `counteredByOfferId`).

---

## Implementation Review (vs PRD)

### What was wrong

- **Sent tab (“LOIs & offers sent”):** When the **seller** countered the buyer’s LOI, a new offer document was created with `buyerId` = buyer, `createdBy` = seller, `counterToOfferId` = original offer id. That counter appears in `getOffersByBuyer(buyerId)` (correct). The badge logic for the **sent** tab did not treat “this offer is a counter created by the other party”:
  - It checked `counterToOfferId && createdBy === uid` → “Counter sent” (correct when buyer sent a counter).
  - It checked `counteredByOfferId` → “Counter received” — but **the counter document** does not have `counteredByOfferId`; only the **original** offer has that. So the counter row never got “Counter received” and fell through to “LOI sent” / “Offer sent”.
- **Result:** Seller’s counter showed as “LOI sent” on the buyer’s “LOIs & offers sent” tab instead of “Counter received”.

### Fix applied

- In `getOfferEventBadge(offer, { isReceived: false })` (sent tab), add **before** the `counteredByOfferId` check:
  - If `offer.counterToOfferId && offer.createdBy !== uid` → return **“Counter received”** (this row is a counter from the other party).
- Order of checks for sent tab is now:
  1. Counter sent (counter + createdBy === uid)
  2. **Counter received (counter + createdBy !== uid)** ← added
  3. Counter received (counteredByOfferId on original)
  4. LOI sent / Offer sent

### Data sources (verified)

- **Received:** `getOffersByProperty(propertyId)` for each of the seller’s properties. Correct.
- **Sent:** `getOffersByBuyer(user.uid)`. Correct; includes both the buyer’s initial offers and counters directed at the buyer (same `buyerId`).
- **Grouping:** Sent tab groups by `propertyId` via `sentByProperty`; each item is one offer row with the correct badge. Correct.

---

## Revision

- **v1.0** — Initial PRD: badge rules for received/sent tabs, data sources, implementation fix for “Counter received” in sent tab, and implementation review.
