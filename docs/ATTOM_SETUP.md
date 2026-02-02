# ATTOM API Setup (All-Properties / Unlisted Parcels)

The **all-properties** map layer uses ATTOM’s Property API to show unlisted parcels (Funk Estimate, last sale) on demand. The app calls **Cloud Functions** (`getMapParcels`, `resolveAddress`, `getPropertySnapshot`) which talk to ATTOM so the API key stays on the server. Results are cached in Firestore and in-memory to reduce API calls; see `docs/ATTOM_API_OVERVIEW.md` for caching details.

---

## 1. Get an ATTOM API Key

1. Sign up at [ATTOM](https://api.developer.attomdata.com/) and create an app.
2. In the developer portal, find your **API Key** (or “APIToken”).
3. Ensure your plan includes:
   - **Property API** (e.g. `propertyapi/v1.0.0`)
   - **allevents/snapshot** (or equivalent snapshot) for AVM, sale, address, and attributes in one call.

---

## 2. Configure the Cloud Function

The function reads the key from either **Firebase config** or **environment variable**:

- `functions.config().attom.api_key` (Firebase 1st-gen config)
- `process.env.ATTOM_API_KEY` (env / 2nd-gen `defineString`)

### Option A: Firebase config (recommended for 1st-gen)

```bash
firebase functions:config:set attom.api_key="YOUR_ATTOM_API_KEY"
```

### Option B: Environment variable

If you run or deploy with `--set-env-vars` or use 2nd-gen secrets, set:

```bash
ATTOM_API_KEY=YOUR_ATTOM_API_KEY
```

For 2nd-gen, you can use `defineString` in `index.js` and then:

```bash
firebase functions:secrets:set ATTOM_API_KEY
```

---

## 3. Deploy the Function

From the project root:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

The `getMapParcels` endpoint will be at:

```
https://us-central1-<PROJECT_ID>.cloudfunctions.net/getParcelsInViewport
```

For `funk-brokers-production`:

```
https://us-central1-funk-brokers-production.cloudfunctions.net/getMapParcels
```

---

## 4. How It’s Used

- **Input:** `n`, `s`, `e`, `w` (viewport in degrees, query or JSON body).
- **Behavior:** The function converts the bbox to a center + radius (0.25–20 mi), calls ATTOM `allevents/snapshot` with `latitude`, `longitude`, and `radius` only. (ATTOM’s `radius` is always miles; do **not** send `radiusunit`—the API rejects it.) Maps the response to:
  - `address`, `latitude`, `longitude`, `estimate`, `lastSaleDate`, `lastSalePrice`, `attomId`, `beds`, `baths`, `squareFeet`.
- **Output:** `{ parcels: [...] }` with CORS enabled.

The frontend calls this on map `idle` only when zoom ≥ 18 and shows unlisted parcels as circle markers with a hover tooltip (Unlisted, Funk Estimate, Last sale).

---

## 5. ATTOM Response Mapping

The function expects an `allevents/snapshot`-style response. It maps (with fallbacks):

| Our field       | ATTOM path(s)                                                                 |
|-----------------|-------------------------------------------------------------------------------|
| `estimate`      | `property.avm.amount.value`, `property.avm.amount`                            |
| `lastSalePrice` | `property.sale.amount.saleAmt`, `saleamt`, etc.                               |
| `lastSaleDate`  | `property.sale.saleSearchDate`, `salesearchdate`, `saleTransDate`, etc.       |
| `address`       | `property.address` (line1, line2, locality, adminarea, postal1)               |
| `latitude`      | `property.location.latitude`, `property.latitude`                             |
| `longitude`     | `property.location.longitude`, `property.longitude`                           |
| `beds`          | `property.building.rooms.beds`, `property.beds`                               |
| `baths`         | `property.building.rooms.bathstotal`, `property.bathstotal`                   |
| `squareFeet`    | `property.building.size.universalsize`, `buildingSize`, `property.squarefeet` |

If your ATTOM product uses different field names, update `functions/attomService.js` (e.g. `mapAttomToParcel`, `mapAttomToAddressParcel`).

---

## 6. Rate Limits and Quota

- The function uses a **radius** (max 20 mi) and ATTOM’s limit (e.g. 100 records) per request.
- The app only requests parcels when the map is **idle** and **zoom ≥ 18** to limit calls.
- **Caching is implemented:** Firestore collections `map_search_snapshot`, `address_attom_map`, and `property_snapshots` reduce ATTOM calls but increase Firestore reads, writes, and stored data. Monitor Firestore usage if budget is a concern.
- Check your ATTOM plan for rate limits; adjust zoom threshold or TTLs in `functions/attomService.js` if needed.

---

## 7. Troubleshooting

| Symptom | Check |
|--------|--------|
| `ATTOM API key not configured` | `firebase functions:config:get` and/or `process.env.ATTOM_API_KEY` in the function. |
| `Upstream API error` / 4xx from ATTOM | ATTOM dashboard: key active, correct product, `allevents/snapshot` (or equivalent) allowed. |
| Empty `parcels` | Response shape may differ; inspect `data` in `functions/index.js` and adjust `mapAttomToParcel` / `data.property` vs `data.properties`. |
| `Invalid Parameter(s) - RADIUSUNIT` | Do not send `radiusunit`; ATTOM’s `radius` is always in miles. Remove it from the request URL. |
| CORS errors from the web app | Function sets `Access-Control-Allow-Origin: *`; if you restrict origins, add your app’s (e.g. GitHub Pages) domain. |
