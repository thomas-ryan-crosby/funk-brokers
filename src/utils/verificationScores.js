/**
 * Verification and property tier scoring.
 *
 * Verified Buyer Score: 0–100 from purchase profile completeness; 100 when buyerVerified.
 *
 * Property tiers (6-tier system):
 * - Basic (Just Claimed): Address + property type + 1 photo
 * - Complete: Property basics + pricing + 1 photo
 * - Verified: Detailed description + 5+ photos (no docs)
 * - Enhanced: Deed + HOA docs (if applicable) + verified pricing + pro photos (30+) + floor plan + video
 * - Premium: Disclosures + pro photos (30+) + floor plan + video + Matterport URL
 * - Elite: Mortgage docs (if applicable) + inspection report + insurance claims rule + 3rd party value review
 */

/**
 * @param {object} profile - purchase profile (purchaseProfiles/{userId})
 * @returns {{ score: number, label: string }}
 */
/**
 * Same criteria as getVerifiedBuyerScore for being "verified": all 4 items must be present.
 * @param {object} profile - { buyerInfo?, verificationDocuments? }
 * @returns {boolean}
 */
export function meetsVerifiedBuyerCriteria(profile) {
  if (!profile) return false;
  const docs = profile.verificationDocuments || {};
  const hasBuyerInfo = !!(profile.buyerInfo?.name && profile.buyerInfo?.email);
  const hasProofOfFunds = !!docs.proofOfFunds;
  const hasPreApprovalOrBank = !!(docs.preApprovalLetter || docs.bankLetter);
  const hasGovernmentId = !!docs.governmentId;
  return hasBuyerInfo && hasProofOfFunds && hasPreApprovalOrBank && hasGovernmentId;
}

export function getVerifiedBuyerScore(profile) {
  if (!profile) return { score: 0, label: 'Not started' };
  /* Always derive from stored data so the widget stays in sync when docs/buyerInfo are removed. */
  const docs = profile.verificationDocuments || {};
  const hasBuyerInfo = !!(profile.buyerInfo?.name && profile.buyerInfo?.email);
  const hasProofOfFunds = !!docs.proofOfFunds;
  const hasPreApprovalOrBank = !!(docs.preApprovalLetter || docs.bankLetter);
  const hasGovernmentId = !!docs.governmentId;

  const items = [hasBuyerInfo, hasProofOfFunds, hasPreApprovalOrBank, hasGovernmentId];
  const completed = items.filter(Boolean).length;
  const score = Math.round((completed / 4) * 100);

  if (score >= 100) return { score: 100, label: 'Verified' };
  if (score >= 75) return { score, label: 'Almost there' };
  if (score >= 50) return { score, label: 'In progress' };
  if (score >= 25) return { score, label: 'Started' };
  return { score, label: 'Not started' };
}

/**
 * Check if property meets Basic tier requirements
 */
function meetsBasicTier(p) {
  if (!p) return false;
  const hasAddress = !!(p.address && (p.city || p.state || p.zipCode));
  const hasType = !!p.propertyType;
  const hasPhoto = (p.photos?.length ?? 0) >= 1;
  return hasAddress && hasType && hasPhoto;
}

/**
 * Check if property meets Complete tier requirements
 */
function meetsCompleteTier(p) {
  if (!meetsBasicTier(p)) return false;
  const hasBedrooms = p.bedrooms != null;
  const hasBathrooms = p.bathrooms != null;
  const hasSqft = p.squareFeet != null;
  const hasLot = p.lotSize != null;
  const hasYearBuilt = p.yearBuilt != null;
  const hasPropertyTax = p.propertyTax != null;
  const hasHoaSelection = p.hasHOA === true || p.hasHOA === false;
  const hasHoaFee = p.hasHOA === true ? (p.hoaFee != null) : true;
  const hasInsuranceSelection = p.hasInsurance === true || p.hasInsurance === false;
  const hasInsuranceAmount = p.hasInsurance === true ? (p.insuranceApproximation != null) : true;
  const hasPricing = !!(p.estimatedWorth && p.makeMeMovePrice);
  const hasPhoto = (p.photos?.length ?? 0) >= 1;
  return hasBedrooms && hasBathrooms && hasSqft && hasLot && hasYearBuilt && hasPropertyTax && hasHoaSelection && hasHoaFee && hasInsuranceSelection && hasInsuranceAmount && hasPricing && hasPhoto;
}

/**
 * Check if property meets Verified tier requirements (NO DOCUMENTS REQUIRED)
 */
function meetsVerifiedTier(p) {
  if (!meetsCompleteTier(p)) return false;
  const hasEnoughPhotos = (p.photos?.length ?? 0) >= 5;
  const hasRichDescription = !!(p.description && p.description.trim().length >= 200);
  return hasEnoughPhotos && hasRichDescription;
}

/**
 * Check if property meets Enhanced tier requirements (DOCUMENTS START HERE)
 */
function meetsEnhancedTier(p) {
  if (!meetsVerifiedTier(p)) return false;
  const hasDeed = !!p.deedUrl;
  const hasHoaDocs = p.hasHOA === true ? !!p.hoaDocsUrl : true; // If no HOA, skip requirement
  const hasVerifiedPricing = !!(p.valuationDocUrl || p.compReportUrl || (Array.isArray(p.verifiedComps) && p.verifiedComps.length >= 1));
  const hasProPhotosConfirmed = p.professionalPhotos === true;
  const hasEnoughPhotos = (p.photos?.length ?? 0) >= 30;
  const hasFloorPlan = !!p.floorPlanUrl;
  const hasVideo = !!(p.videoTourUrl || (Array.isArray(p.videoFiles) && p.videoFiles.length > 0) || (Array.isArray(p.videos) && p.videos.length > 0));
  return hasDeed && hasHoaDocs && hasVerifiedPricing && hasProPhotosConfirmed && hasEnoughPhotos && hasFloorPlan && hasVideo;
}

/**
 * Check if property meets Premium tier requirements
 */
function meetsPremiumTier(p) {
  if (!meetsEnhancedTier(p)) return false;
  const hasDisclosures = !!p.disclosureFormsUrl;
  const hasProPhotosConfirmed = p.professionalPhotos === true;
  const hasEnoughPhotos = (p.photos?.length ?? 0) >= 30;
  const hasFloorPlan = !!p.floorPlanUrl;
  const hasVideo = !!(p.videoTourUrl || (Array.isArray(p.videoFiles) && p.videoFiles.length > 0) || (Array.isArray(p.videos) && p.videos.length > 0));
  const hasMatterport = !!p.matterportTourUrl;
  return hasDisclosures && hasProPhotosConfirmed && hasEnoughPhotos && hasFloorPlan && hasVideo && hasMatterport;
}

/**
 * Check if property meets Elite tier requirements
 */
function meetsEliteTier(p) {
  if (!meetsPremiumTier(p)) return false;
  const hasMortgageDocs = p.hasMortgage === true ? !!(p.mortgageDocUrl || p.payoffOrLienReleaseUrl) : true; // If no mortgage, skip requirement
  const hasInspectionReport = !!p.inspectionReportUrl;
  const insuranceClaimsAnswered = p.hasInsuranceClaims === true || p.hasInsuranceClaims === false;
  const insuranceClaimsSatisfied = p.hasInsuranceClaims === true
    ? (!!p.insuranceClaimsReportUrl && !!(p.insuranceClaimsDescription || '').trim())
    : (p.hasInsuranceClaims === false);
  const hasThirdPartyReview = !!(
    (p.thirdPartyReviewConfirmed === true && (p.thirdPartyReviewVendorId || p.thirdPartyReviewVendor)) ||
    p.valuationDocUrl ||
    p.compReportUrl
  );
  return hasMortgageDocs && hasInspectionReport && insuranceClaimsAnswered && insuranceClaimsSatisfied && hasThirdPartyReview;
}

/**
 * @param {object} p - property
 * @returns {'basic'|'complete'|'verified'|'enhanced'|'premium'|'elite'}
 */
export function getListingTier(p) {
  if (!p) return 'basic';
  
  // Check from highest to lowest tier
  if (meetsEliteTier(p)) return 'elite';
  if (meetsPremiumTier(p)) return 'premium';
  if (meetsEnhancedTier(p)) return 'enhanced';
  if (p.verified === true && meetsCompleteTier(p)) return 'verified';
  if (meetsVerifiedTier(p)) return 'verified';
  if (meetsCompleteTier(p)) return 'complete';
  if (meetsBasicTier(p)) return 'basic';
  
  return 'basic';
}

/**
 * @param {object} p - property
 * @returns {boolean}
 */
export function isListed(p) {
  if (!p) return false;
  return p.status === 'active' && p.archived !== true;
}

/**
 * @param {'basic'|'complete'|'verified'|'enhanced'|'premium'|'elite'} tier
 * @returns {string}
 */
export function getListingTierLabel(tier) {
  const map = {
    basic: 'Just Claimed',
    complete: 'Complete',
    verified: 'Verified',
    enhanced: 'Enhanced',
    premium: 'Premium',
    elite: 'Elite',
  };
  return map[tier] || 'Just Claimed';
}

/**
 * Progress toward the next property tier. For use on Property Detail.
 * @param {object} p - property
 * @returns {{ tier: 'basic'|'complete'|'verified'|'enhanced'|'premium'|'elite', nextTier: string|null, percentage: number, missingItems: string[] }}
 */
export function getListingTierProgress(p) {
  const tier = getListingTier(p);
  const photoCount = p?.photos?.length ?? 0;
  const descLength = (p?.description || '').trim().length;
  const hasHoaSelection = p?.hasHOA === true || p?.hasHOA === false;
  const hasInsuranceSelection = p?.hasInsurance === true || p?.hasInsurance === false;

  if (tier === 'basic') {
    const steps = [
      { done: !!(p?.address && (p?.city || p?.state || p?.zipCode)), label: 'Address' },
      { done: !!p?.propertyType, label: 'Property type' },
      { done: !!(p?.bedrooms != null), label: 'Bedrooms' },
      { done: !!(p?.bathrooms != null), label: 'Bathrooms' },
      { done: p?.squareFeet != null, label: 'Square feet' },
      { done: p?.lotSize != null, label: 'Lot size' },
      { done: p?.yearBuilt != null, label: 'Year built' },
      { done: p?.propertyTax != null, label: 'Property tax' },
      { done: hasHoaSelection, label: 'HOA selection' },
      { done: p?.hasHOA === true ? (p?.hoaFee != null) : hasHoaSelection, label: 'HOA fee (if applicable)' },
      { done: hasInsuranceSelection, label: 'Insurance selection' },
      { done: p?.hasInsurance === true ? (p?.insuranceApproximation != null) : hasInsuranceSelection, label: 'Insurance amount (if applicable)' },
      { done: !!(p?.estimatedWorth), label: 'Estimated property worth' },
      { done: !!(p?.makeMeMovePrice), label: 'Make me move price' },
      { done: photoCount >= 1, label: `Photos (${photoCount}/1 minimum)` },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'basic',
      nextTier: 'Complete',
      percentage: Math.round((completed / steps.length) * 100),
      missingItems,
    };
  }

  if (tier === 'complete') {
    const steps = [
      { done: descLength >= 200, label: `Description (${descLength}/200 characters)` },
      { done: photoCount >= 5, label: `Photos (${photoCount}/5 minimum)` },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'complete',
      nextTier: 'Verified',
      percentage: Math.round((completed / steps.length) * 100),
      missingItems,
    };
  }

  if (tier === 'verified') {
    const steps = [
      { done: !!p?.deedUrl, label: 'Deed upload' },
      { done: p?.hasHOA === true ? !!p?.hoaDocsUrl : true, label: p?.hasHOA === true ? 'HOA documents' : 'HOA documents (N/A)' },
      { done: !!(p?.valuationDocUrl || p?.compReportUrl || (p?.verifiedComps?.length ?? 0) >= 1), label: 'Verified pricing (comps or appraisal)' },
      { done: p?.professionalPhotos === true, label: 'Professional photos checkbox' },
      { done: photoCount >= 30, label: `Photos (${photoCount}/30 minimum)` },
      { done: !!p?.floorPlanUrl, label: 'Floor plan' },
      { done: !!(p?.videoTourUrl || (Array.isArray(p?.videoFiles) && p.videoFiles.length > 0) || (Array.isArray(p?.videos) && p.videos.length > 0)), label: 'Video' },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'verified',
      nextTier: 'Enhanced',
      percentage: Math.round((completed / steps.length) * 100),
      missingItems,
    };
  }

  if (tier === 'enhanced') {
    const steps = [
      { done: !!p?.disclosureFormsUrl, label: 'Disclosure forms' },
      { done: !!p?.matterportTourUrl, label: 'Matterport URL' },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'enhanced',
      nextTier: 'Premium',
      percentage: Math.round((completed / steps.length) * 100),
      missingItems,
    };
  }

  if (tier === 'premium') {
    const steps = [
      { done: p?.hasMortgage === true ? !!(p?.mortgageDocUrl || p?.payoffOrLienReleaseUrl) : true, label: p?.hasMortgage === true ? 'Mortgage documents' : 'Mortgage documents (N/A)' },
      { done: !!p?.inspectionReportUrl, label: 'Inspection report' },
      { done: p?.hasInsuranceClaims === true || p?.hasInsuranceClaims === false, label: 'Insurance claims question' },
      { done: p?.hasInsuranceClaims === true ? (!!p?.insuranceClaimsReportUrl && !!(p?.insuranceClaimsDescription || '').trim()) : (p?.hasInsuranceClaims === false), label: 'Insurance claims documentation' },
      { done: !!((p?.thirdPartyReviewConfirmed === true && (p?.thirdPartyReviewVendorId || p?.thirdPartyReviewVendor)) || p?.valuationDocUrl || p?.compReportUrl), label: '3rd party value review' },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'premium',
      nextTier: 'Elite',
      percentage: Math.round((completed / steps.length) * 100),
      missingItems,
    };
  }

  return {
    tier: 'elite',
    nextTier: null,
    percentage: 100,
    missingItems: [],
  };
}
