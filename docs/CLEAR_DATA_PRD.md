# Clear All Application Data — Product Requirements

## Purpose

Provide a single, safe, repeatable way to wipe **all application data** from Firestore (and optionally Firebase Storage) while **preserving user accounts and user profiles**. Use cases:

- **Reset environment** — Staging or dev databases that need to be cleared for a fresh test run.
- **Privacy / compliance** — Remove all user-generated and transactional data while keeping identity (e.g. before a pivot or data-handling change).
- **Recovery** — Start from a clean slate after bad data or migration issues.

This document defines what gets deleted, what is preserved, how the script behaves, and how to run it safely.

---

## Goals

1. **Clear all business and UGC data** — Properties, posts, messages, offers, transactions, favorites, pings, checklists, profiles (sale/purchase), saved searches, vendors, listing progress.
2. **Preserve identity** — Keep the `users` Firestore collection and Firebase Authentication accounts so people can still log in.
3. **Optional Storage wipe** — Optionally delete all files in Firebase Storage (property photos, user documents, etc.).
4. **Safe by default** — Require explicit confirmation; do not run automatically.
5. **Documented and maintainable** — One PRD, one script, one README; update when new collections or subcollections are added.

---

## Out of Scope

- **Firebase Authentication** — User accounts (email/password, etc.) are **not** deleted. Only Firestore (and optionally Storage) is touched.
- **Firestore Security Rules** — Rules are unchanged.
- **Cloud Functions / backend** — No server-side state is cleared (e.g. ATTOM caches in Firestore are not part of this script; they can be added later if desired).
- **Backup/restore** — The script does not create backups; operators should export/back up separately if needed.

---

## What Gets Deleted (Firestore)

All documents in these **top-level collections** are deleted. Order of deletion does not matter for referential integrity because we do not enforce FKs; the script processes collections in a fixed order for predictability.

| Collection | Description |
|------------|-------------|
| `properties` | All property listings (claimed and listed). |
| `saleProfiles` | Per-user seller preferences and sale-related profile data. |
| `purchaseProfiles` | Per-user buyer profiles: buying power, verification docs metadata, pre-approval, proof of funds, government ID metadata. |
| `savedSearches` | User-saved property search criteria and filters. |
| `vendors` | Vendors (title, inspection, mortgage, etc.) linked to users. |
| `messages` | All internal messages/conversations between users. |
| `offers` | All property offers and counter-offers. |
| `transactions` | All transaction records (post-acceptance deal steps). |
| `favorites` | User favorites (saved properties). |
| `preListingChecklists` | Pre-listing checklist data per property. |
| `listingProgress` | Listing progress records per property. |
| `posts` | Community posts (and their **comments** subcollection — see below). |
| `pings` | “Ping owner” / inquiry records from buyers to sellers. |

### Subcollections

- **`posts/{postId}/comments`** — Comments are a subcollection under each post. The script **must** delete all comment documents for each post before deleting the post document; otherwise Firestore will leave orphaned comment subcollections.

No other subcollections are currently used by the app for the listed data; if new subcollections are added (e.g. under `transactions` or `messages`), the script and this PRD must be updated.

---

## What Is Preserved

| Item | Reason |
|------|--------|
| **`users` collection** | User profiles (display name, phone, roles, etc.) so that after a wipe, users can still log in and see their profile. |
| **Firebase Authentication** | Login accounts (email/password, etc.) are not modified by this script. |
| **Firestore rules** | No changes. |
| **Storage files** | By default, **not** deleted; only Firestore docs are cleared. Optional flag to delete Storage as well (see below). |

---

## Firebase Storage (Optional)

- **Default:** Storage is **not** deleted. Only Firestore collections above are cleared.
- **Optional:** A configuration flag (e.g. `DELETE_STORAGE_FILES: true`) can enable deletion of **all files** in the default Storage bucket (e.g. property photos, user uploads, verification documents). When enabled, the script lists and deletes all objects in the bucket; no path allowlist is applied.

Storage paths used by the app (for reference only; not an exhaustive list):

- Property photos and documents (e.g. under `properties/` or similar).
- User verification documents, profile photos (e.g. under `users/` or similar).

---

## Script Behavior (High Level)

1. **Initialization** — Load Firebase Admin SDK; ensure `firebase/serviceAccountKey.json` exists; connect to Firestore (and Storage if configured).
2. **Confirmation** — Print exactly which collections will be cleared and whether Storage will be wiped. Require the user to type a fixed phrase (e.g. `DELETE ALL DATA`) to proceed; otherwise exit without deleting anything.
3. **Deletion** — For each collection in a defined order:
   - **Posts:** For each document in `posts`, delete all documents in `posts/{postId}/comments`, then delete the post document. Batch for efficiency.
   - **All other listed collections:** Delete all documents in the collection in batches (e.g. 500 docs per batch) to respect Firestore limits.
4. **Storage (optional)** — If enabled, list all files in the default bucket and delete them.
5. **Summary** — Print counts per collection (and Storage if applicable), total documents/files deleted, and any errors. Exit with 0 on full success, non-zero if any critical failure.

Safety and operability:

- **Idempotent** — Running the script again after a full run simply finds no (or few) documents and deletes nothing (or the remainder).
- **No dry-run by default** — The script only deletes after confirmation. Optionally a `--dry-run` (or similar) can be added to only log what would be deleted without deleting.
- **Errors** — If one collection fails (e.g. permission), log the error and continue with other collections; report all errors in the summary.

---

## Configuration (Script)

- **Collections list** — Maintained in the script (and in this PRD) so that new app collections are added in one place.
- **Batch size** — e.g. 500 documents per Firestore batch (configurable).
- **DELETE_STORAGE_FILES** — Boolean; default `false`. When `true`, after clearing Firestore, delete all Storage files in the default bucket.
- **Confirmation phrase** — Exact string required to proceed (e.g. `DELETE ALL DATA`).

---

## How to Run (Summary)

1. Install dependencies (e.g. `firebase-admin` at project root or in a script-friendly environment).
2. Ensure `firebase/serviceAccountKey.json` exists and has permissions to delete Firestore data (and Storage if enabled).
3. Run: `node scripts/clearAllData.js`.
4. When prompted, type the exact confirmation phrase.
5. Review the summary and any errors.

**Do not** run in production unless the intent is to permanently remove all application data except users. Prefer running against staging/development first.

---

## Maintenance

- When a **new Firestore collection** is added that holds user or app data (not system/config), add it to the script’s list and to this PRD (table “What Gets Deleted”).
- When a **new subcollection** is added (e.g. under `posts` or elsewhere), implement deletion of that subcollection before deleting parent documents and update this PRD.
- When **Storage layout** or product requirements change, update the “Firebase Storage (Optional)” section and the script if needed.

---

## Document Info

- **Last updated:** 2026-01-31  
- **Script:** `scripts/clearAllData.js`  
- **User-facing README:** `scripts/CLEAR_ALL_DATA_README.md`
