# Firebase removal audit

**Date:** 2025-02-03  
**Branch:** dev/cost-architecture-refactor  
**Goal:** Identify every remaining Firebase/Firestore dependency so the branch can be fully severed from Firebase (except optional Firebase Auth).

**Status (post-removal):** Firebase **Auth only** remains. All Firestore, Storage, and Cloud Functions usage has been removed and replaced with Postgres API and Vercel Blob/API.

---

## Summary: Are we completely removed from Firebase?

**Yes (except Auth).** The app now uses:
- **Postgres** for all data (properties, users, favorites, offers, messages, transactions, social, listing progress, profiles, saved searches, PSA drafts, pings, vendors, feedback, pre-listing checklists).
- **Vercel Blob** (via `/api/upload`) for file uploads; **Persona** via `/api/persona/inquiry`.
- **Firebase** only for **Authentication** (sign-in, sign-up, session). You can replace this later with another auth provider.

---

## 1. Already migrated (no Firestore in code path)

| Area | Status |
|------|--------|
| **Properties** | `propertyService.js` – Postgres API only (getAll, getById, search, create, update, delete, claim). |
| **Users / profile** | `authService.js` – Firebase **Auth** only; profile read/write via `usersApiService` (Postgres). |
| **Favorites** | `favoritesService.js` – Postgres API only. |
| **Offers** | `offerService.js` – Postgres API only. |
| **Messages** | `messageService.js` – Postgres API only. |
| **Transactions** | `transactionService.js` – Postgres API only. |
| **Browse / Feed data** | `firestoreLayer.js` – Name is historical; it only calls `propertyService` and `parcelService`. No direct Firestore. So `Feed.jsx` and `Home.jsx` use Postgres for properties. |

---

## 2. Still using Firebase

### 2.1 Firebase Auth (intentionally kept)

- **`src/config/firebase.js`** – Exports `auth` (and still initializes `db`, `storage`, `functions`).
- **`src/services/authService.js`** – Uses `firebase/auth`: signUp, signIn, signOut, onAuthStateChanged, updateProfile, updatePassword. Profile data is from Postgres API.

To be “Firestore/Storage/Functions removed” we can keep Auth and thin `firebase.js` to only initialize Auth (and optionally Storage if kept).

---

### 2.2 Firestore – still in use (by flag or always)

| File | What it does | Gated by flag? |
|------|----------------|-----------------|
| **`src/services/postService.js`** | createPost, getPostsByAuthor, getPostsForProperty, getPostsForAddress, getFeedPosts, deletePost, updateCounts use Firestore when `USE_SOCIAL_READS` is false. | Yes – `USE_SOCIAL_READS` |
| **`src/services/likeService.js`** | getLikedPostIds, likePost, unlikePost use Firestore when `USE_SOCIAL_READS` is false. | Yes – `USE_SOCIAL_READS` |
| **`src/services/followService.js`** | getFollowing, follow, unfollow, getFollowers use Firestore when `USE_SOCIAL_READS` is false. | Yes – `USE_SOCIAL_READS` |
| **`src/services/psaDraftService.js`** | savePsaDraft, getPsaDraftsByUser, getPsaDraftById, deletePsaDraft – all Firestore. | No |
| **`src/services/pingService.js`** | Firestore for pings. | No |
| **`src/services/profileService.js`** | Firestore for profile (overlaps with usersApiService). | No |
| **`src/services/vendorService.js`** | Firestore for vendors. | No |
| **`src/services/feedbackService.js`** | Firestore for feedback. | No |
| **`src/services/preListingChecklistService.js`** | Firestore for pre-listing checklists. | No |
| **`src/services/listingProgressService.js`** | getListingProgress, saveListingProgress – Firestore `listingProgress` collection. | No |
| **`src/pages/ListProperty.jsx`** | After creating a property, deletes `listingProgress/{propertyId}` via dynamic import of `firebase/firestore` and `config/firebase`. | No |

---

### 2.3 Firebase Storage

| File | What it does |
|------|----------------|
| **`src/services/storageService.js`** | uploadFile, uploadMultipleFiles, uploadMultipleFilesWithProgress, deleteFile – all Firebase Storage. Used for property photos and documents (e.g. from `ListProperty.jsx`). |

Removal would require another storage backend (e.g. Vercel Blob, S3) and an upload API.

---

### 2.4 Firebase Cloud Functions

| File | What it does |
|------|----------------|
| **`src/services/personaService.js`** | Uses `functions` from `config/firebase` to call HTTPS callable. |

Removal would require a replacement serverless endpoint (e.g. Vercel serverless) that implements the same behavior.

---

### 2.5 Firebase config only (no Firestore)

| File | Usage |
|------|--------|
| **`src/services/parcelService.js`** | `firebaseConfig.projectId` to build `FUNCTIONS_BASE` URL when not using ATTOM cache. Can be replaced with e.g. `VITE_FIREBASE_PROJECT_ID` or `VITE_ATTOM_FUNCTIONS_BASE`. |
| **`src/utils/loadGooglePlaces.js`** | `firebaseConfig` – likely for API keys. Can be replaced with env vars. |

---

## 3. Feature flags that gate Firebase vs Postgres

| Flag | Purpose |
|------|--------|
| **`USE_SOCIAL_READS`** | When true: postService, likeService, followService use Postgres/social API. When false: they use Firestore. |
| **`USE_POSTGRES_FOR_ALL`** | Referenced in API service comments (properties, users, favorites, offers, messages). Core services (property, auth, favorites, offers, messages) already use Postgres unconditionally; flag could be removed from code. |
| **`USE_FIRESTORE_REALTIME`** | Documented in featureFlags.js (no onSnapshot when false). |
| **`FIRESTORE_READ_KILL_SWITCH`** | When true: properties browse returns cached/empty; map pins cached only. |

To be “completely severed regardless of feature flags”: set behavior to Postgres/API-only and remove these flags from the code paths above.

---

## 4. Other references (docs / metrics)

- **`src/utils/metrics.js`** – Counters `firestoreReads`, `firestoreWrites`. Can be renamed or removed once Firestore is gone.
- **`docs/`** – PHASE0_COST_ARCHITECTURE_REVIEW.md, FIREBASE_AUTH_SETUP.md, etc. mention Firebase; update when removing.
- **`DEPLOYMENT_TROUBLESHOOTING.md`**, **`README.md`**, **`SETUP.md`** – Reference `firebase-config.js`; keep or update for Auth-only setup.

---

## 5. Recommended order to fully remove Firestore

1. **Social (posts, likes, follows)**  
   - In `postService.js`, `likeService.js`, `followService.js`: remove `USE_SOCIAL_READS` branches and use only Postgres/social API.  
   - Remove `USE_SOCIAL_READS` from `featureFlags.js` and any remaining usages.

2. **Listing progress**  
   - Add Postgres table + API for `listingProgress` (or key-value by propertyId).  
   - Migrate `listingProgressService.js` to API only.  
   - In `ListProperty.jsx`, replace dynamic Firestore delete with API call or new `listingProgressService` method.

3. **Remaining Firestore services**  
   - One by one: add Postgres schema + API, then switch:  
     - psaDraftService  
     - pingService  
     - profileService (consolidate with users if needed)  
     - vendorService  
     - feedbackService  
     - preListingChecklistService  

4. **Firebase config**  
   - In `firebase.js`: remove `getFirestore`, `getStorage`, `getFunctions`; keep only `getAuth` (and optionally Storage if not yet migrated).  
   - Replace `firebaseConfig` usage in parcelService and loadGooglePlaces with env vars where possible.

5. **Storage & Functions**  
   - Plan migration of `storageService.js` to a non-Firebase storage and of `personaService.js` to a non-Firebase endpoint; then remove those Firebase dependencies.

6. **Cleanup**  
   - Remove Firestore-related feature flags and kill switches from code.  
   - Update or remove `firestoreReads`/`firestoreWrites` in metrics.  
   - Update docs to reflect “Postgres + optional Firebase Auth (and optional Storage until migrated).”

---

## 6. Quick reference – files that still import Firebase

| File | Imports |
|------|--------|
| `src/config/firebase.js` | app, auth, db, storage, functions, analytics |
| `src/services/authService.js` | `firebase/auth`, `auth` from config |
| `src/services/postService.js` | `firebase/firestore`, `db` |
| `src/services/likeService.js` | `firebase/firestore`, `db` |
| `src/services/followService.js` | `firebase/firestore`, `db` |
| `src/services/psaDraftService.js` | `firebase/firestore`, `db` |
| `src/services/pingService.js` | `firebase/firestore`, `db` |
| `src/services/profileService.js` | `firebase/firestore`, `db` |
| `src/services/vendorService.js` | `firebase/firestore`, `db` |
| `src/services/feedbackService.js` | `firebase/firestore`, `db` |
| `src/services/preListingChecklistService.js` | `firebase/firestore`, `db` |
| `src/services/listingProgressService.js` | `firebase/firestore`, `db` |
| `src/services/storageService.js` | `firebase/storage`, `storage` from config |
| `src/services/personaService.js` | `functions` from config |
| `src/pages/ListProperty.jsx` | Dynamic: `firebase/firestore`, `db` |
| `src/services/parcelService.js` | `firebase-config` (config only) |
| `src/utils/loadGooglePlaces.js` | `firebase-config` (config only) |
| `src/pages/Feed.jsx` | `firestoreLayer` (no direct Firebase; layer uses propertyService) |
| `src/pages/Home.jsx` | `firestoreLayer` (no direct Firebase) |

This audit reflects the codebase as of the audit date; re-run searches after changes to confirm.
