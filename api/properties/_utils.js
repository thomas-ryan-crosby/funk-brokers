/** Normalize JSON/JSONB column to array (pg can return string or object). */
function normalizeJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Array.isArray(val) ? val : (Array.isArray(val) ? val : []);
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (_) { return []; }
  }
  return [];
}

function normalizeTriBool(val) {
  if (val === true) return true;
  if (val === false) return false;
  return null;
}

/**
 * Map Postgres property row to client shape (camelCase).
 */
function mapRowToProperty(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    latitude: row.latitude,
    longitude: row.longitude,
    attomId: row.attom_id,
    propertyType: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms != null ? Number(row.bathrooms) : null,
    squareFeet: row.square_feet,
    price: row.price != null ? Number(row.price) : null,
    funkEstimate: row.funk_estimate != null ? Number(row.funk_estimate) : null,
    photos: normalizeJsonArray(row.photos),
    features: normalizeJsonArray(row.features),
    status: row.status,
    availableForSale: row.available_for_sale === true,
    acceptingOffers: row.accepting_offers === true,
    acceptingCommunications: row.accepting_communications !== false,
    archived: row.archived === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Extended fields (migration 008)
    description: row.description ?? undefined,
    lotSize: row.lot_size != null ? Number(row.lot_size) : null,
    yearBuilt: row.year_built != null ? Number(row.year_built) : null,
    hoaFee: row.hoa_fee != null ? Number(row.hoa_fee) : null,
    propertyTax: row.property_tax != null ? Number(row.property_tax) : null,
    imGonePrice: row.im_gone_price != null ? Number(row.im_gone_price) : null,
    hasHOA: normalizeTriBool(row.has_hoa),
    deedUrl: row.deed_url ?? undefined,
    propertyTaxRecordUrl: row.property_tax_record_url ?? undefined,
    hoaDocsUrl: row.hoa_docs_url ?? undefined,
    disclosureFormsUrl: row.disclosure_forms_url ?? undefined,
    inspectionReportUrl: row.inspection_report_url ?? undefined,
    sellerName: row.seller_name ?? undefined,
    sellerEmail: row.seller_email ?? undefined,
    professionalPhotos: row.professional_photos === true,
    estimatedWorth: row.estimated_worth != null ? Number(row.estimated_worth) : null,
    makeMeMovePrice: row.make_me_move_price != null ? Number(row.make_me_move_price) : null,
    hasInsurance: normalizeTriBool(row.has_insurance),
    insuranceApproximation: row.insurance_approximation != null ? Number(row.insurance_approximation) : null,
    hasMortgage: normalizeTriBool(row.has_mortgage),
    remainingMortgage: row.remaining_mortgage != null ? Number(row.remaining_mortgage) : null,
    mortgageDocUrl: row.mortgage_doc_url ?? undefined,
    payoffOrLienReleaseUrl: row.payoff_or_lien_release_url ?? undefined,
    lienTax: normalizeTriBool(row.lien_tax),
    lienHOA: normalizeTriBool(row.lien_hoa),
    lienMechanic: normalizeTriBool(row.lien_mechanic),
    lienOtherDetails: row.lien_other_details ?? undefined,
    verifiedComps: normalizeJsonArray(row.verified_comps),
    videoFiles: normalizeJsonArray(row.video_files),
    floorPlanUrl: row.floor_plan_url ?? undefined,
    valuationDocUrl: row.valuation_doc_url ?? undefined,
    compReportUrl: row.comp_report_url ?? undefined,
    matterportTourUrl: row.matterport_tour_url ?? undefined,
    hasInsuranceClaims: normalizeTriBool(row.has_insurance_claims),
    insuranceClaimsDescription: row.insurance_claims_description ?? undefined,
    insuranceClaimsReportUrl: row.insurance_claims_report_url ?? undefined,
    thirdPartyReviewConfirmed: normalizeTriBool(row.third_party_review_confirmed),
    thirdPartyReviewVendorId: row.third_party_review_vendor_id ?? undefined,
    verified: normalizeTriBool(row.verified),
    verifiedAt: row.verified_at ?? undefined,
    attomSnapshot: row.attom_snapshot && typeof row.attom_snapshot === 'string'
      ? JSON.parse(row.attom_snapshot)
      : (row.attom_snapshot ?? null),
  };
}

function parseDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse limit query param, default 75, max 200 */
function parseLimit(value, fallback = 75, max = 200) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

module.exports = { mapRowToProperty, parseDate, parseLimit, normalizeJsonArray };
