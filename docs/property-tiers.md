# Property Listing Tiers

OpenTo uses a 6-tier system to indicate the completeness and trustworthiness of a property listing. Each tier builds on the previous — all requirements from lower tiers must be met before advancing.

---

## Tier 1: Basic (Claimed)

The entry-level tier. A property reaches this tier when it is first claimed with minimal information.

| # | Required Field | Property Column |
|---|---------------|-----------------|
| 1 | Address (with city, state, or zip) | `address` + (`city` \| `state` \| `zipCode`) |
| 2 | Property type | `propertyType` |

---

## Tier 2: Complete

The owner has filled in all core property details and set pricing.

| # | Required Field | Property Column | Notes |
|---|---------------|-----------------|-------|
| 1 | All Basic tier requirements | — | — |
| 2 | Bedrooms | `bedrooms` | Must not be null |
| 3 | Bathrooms | `bathrooms` | Must not be null |
| 4 | Square feet | `squareFeet` | Must not be null |
| 5 | Lot size | `lotSize` | Must not be null |
| 6 | Year built | `yearBuilt` | Must not be null |
| 7 | Property tax | `propertyTax` | Must not be null |
| 8 | HOA selection | `hasHOA` | Must be `true` or `false` |
| 9 | HOA fee (if HOA = yes) | `hoaFee` | Required only when `hasHOA === true` |
| 10 | Insurance selection | `hasInsurance` | Must be `true` or `false` |
| 11 | Insurance amount (if insured) | `insuranceApproximation` | Required only when `hasInsurance === true` |
| 12 | Estimated property worth | `estimatedWorth` | Must be truthy |
| 13 | Make me move price | `makeMeMovePrice` | Must be truthy |
| 14 | At least 1 photo | `photos` (length >= 1) | Same as Basic |

---

## Tier 3: Verified

The listing has a detailed description and enough photos for buyers to evaluate remotely. **No documents required** at this tier.

| # | Required Field | Property Column | Notes |
|---|---------------|-----------------|-------|
| 1 | All Complete tier requirements | — | — |
| 2 | Property description (200+ characters) | `description` | Trimmed length >= 200 |
| 3 | Legal description | `legalDescription` | Must not be empty |
| 4 | 5+ photos | `photos` (length >= 5) | — |

> **Note:** A property can also reach Verified tier if `verified === true` is set and it meets Complete requirements.

---

## Tier 4: Enhanced

Documents begin here. The listing includes deed verification, professional media, and pricing validation.

| # | Required Field | Property Column | Notes |
|---|---------------|-----------------|-------|
| 1 | All Verified tier requirements | — | — |
| 2 | Deed upload | `deedUrl` | Must be truthy |
| 3 | HOA documents (if HOA = yes) | `hoaDocsUrl` | Required only when `hasHOA === true` |
| 4 | Verified pricing | `valuationDocUrl` \| `compReportUrl` \| `verifiedComps` (>= 1) | At least one pricing validation method |
| 5 | Professional photos confirmed | `professionalPhotos` | Must be `true` |
| 6 | 15+ photos | `photos` (length >= 15) | — |
| 7 | Floor plan | `floorPlanUrl` | Must be truthy |
| 8 | Video tour | `videoTourUrl` \| `videoFiles` (length > 0) \| `videos` (length > 0) | At least one video source |

---

## Tier 5: Premium

Adds seller disclosures and immersive 3D tour.

| # | Required Field | Property Column | Notes |
|---|---------------|-----------------|-------|
| 1 | All Enhanced tier requirements | — | — |
| 2 | Disclosure forms | `disclosureFormsUrl` | Must be truthy |
| 3 | Professional photos confirmed | `professionalPhotos` | Must be `true` (carried from Enhanced) |
| 4 | 15+ photos | `photos` (length >= 15) | Carried from Enhanced |
| 5 | Floor plan | `floorPlanUrl` | Carried from Enhanced |
| 6 | Video tour | `videoTourUrl` \| `videoFiles` \| `videos` | Carried from Enhanced |
| 7 | Matterport 3D tour URL | `matterportTourUrl` | Must be truthy |

---

## Tier 6: Elite

The highest tier. Full financial transparency, inspection, and third-party validation.

| # | Required Field | Property Column | Notes |
|---|---------------|-----------------|-------|
| 1 | All Premium tier requirements | — | — |
| 2 | Mortgage documents (if mortgaged) | `mortgageDocUrl` \| `payoffOrLienReleaseUrl` | Required only when `hasMortgage === true` |
| 3 | Inspection report | `inspectionReportUrl` | Must be truthy |
| 4 | Insurance claims answered | `hasInsuranceClaims` | Must be `true` or `false` |
| 5 | Insurance claims docs (if claims exist) | `insuranceClaimsReportUrl` + `insuranceClaimsDescription` | Both required when `hasInsuranceClaims === true` |
| 6 | 3rd party value review | `thirdPartyReviewConfirmed` + vendor \| `valuationDocUrl` \| `compReportUrl` | Confirmed review with vendor, or valuation/comp docs |

---

## Summary Table

| Tier | Label | Key New Requirements |
|------|-------|---------------------|
| 1 | Claimed | Address, property type |
| 2 | Complete | Bedrooms, bathrooms, sqft, lot size, year built, tax, HOA, insurance, pricing |
| 3 | Verified | Property description (200+ chars), legal description, 5+ photos |
| 4 | Enhanced | Deed, HOA docs, verified pricing, pro photos, 15+ photos, floor plan, video |
| 5 | Premium | Disclosure forms, Matterport 3D tour |
| 6 | Elite | Mortgage docs, inspection report, insurance claims, 3rd party review |

---

## ATTOM Snapshot & Tiers

When a property is claimed, the server fetches an ATTOM API snapshot and stores it as `attom_snapshot` JSONB. These values are displayed on the property detail page but **do NOT auto-count toward tier advancement**. Users must confirm ATTOM-suggested values via the Edit Property form, which writes them to the actual property columns (e.g., `bedrooms`, `bathrooms`, `squareFeet`). Only then do they count toward the tier.

---

*Source: `src/utils/verificationScores.js`*
