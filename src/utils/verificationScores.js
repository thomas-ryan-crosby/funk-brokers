/**
 * Verification and property tier scoring.
 *
 * Verified Buyer Score: 0–100 from purchase profile completeness; 100 when buyerVerified.
 *
 * Property tiers (6-tier system):
 * - Basic: Minimal viable listing (address, type, price, 1 photo, basic description)
 * - Complete: Full basic info (beds/baths, sqft/lot, 3+ photos, 100+ char description, 2+ features)
 * - Verified: Rich data without docs (5+ photos, year built, both sqft/lot, 200+ char description, 5+ features, HOA info)
 * - Enhanced: Ownership verified + pricing (deed, tax record, HOA docs if applicable, estimated worth OR make me move, 1+ comps)
 * - Premium: Professional assets (professional photos OR 10+ photos, 1+ advanced asset, disclosures, 300+ char description)
 * - Elite: Maximum richness (3+ advanced assets, professional photos confirmed, video/drone, all disclosures, 3+ comps, mortgage docs if applicable)
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
  const hasPrice = p.price != null && p.price > 0;
  const hasPhoto = (p.photos?.length ?? 0) >= 1;
  return hasAddress && hasType && hasPrice && hasPhoto;
}

/**
 * Check if property meets Complete tier requirements
 */
function meetsCompleteTier(p) {
  if (!meetsBasicTier(p)) return false;
  const hasBedrooms = p.bedrooms != null;
  const hasBathrooms = p.bathrooms != null;
  const hasSqftOrLot = !!(p.squareFeet || p.lotSize);
  const hasEnoughPhotos = (p.photos?.length ?? 0) >= 3;
  const hasFeatures = Array.isArray(p.features) && p.features.length >= 2;
  const hasPricing = !!(p.estimatedWorth || p.makeMeMovePrice);
  return hasBedrooms && hasBathrooms && hasSqftOrLot && hasEnoughPhotos && hasFeatures && hasPricing;
}

/**
 * Check if property meets Verified tier requirements (NO DOCUMENTS REQUIRED)
 */
function meetsVerifiedTier(p) {
  if (!meetsCompleteTier(p)) return false;
  const hasEnoughPhotos = (p.photos?.length ?? 0) >= 5;
  const hasYearBuilt = p.yearBuilt != null;
  const hasBothSqftAndLot = !!(p.squareFeet && p.lotSize);
  const hasRichDescription = !!(p.description && p.description.trim().length >= 200);
  const hasManyFeatures = Array.isArray(p.features) && p.features.length >= 5;
  const hasHoaInfo = p.hasHOA === true ? (p.hoaFee != null) : (p.hasHOA === false || p.hoaFee != null);
  return hasEnoughPhotos && hasYearBuilt && hasBothSqftAndLot && hasRichDescription && hasManyFeatures && hasHoaInfo;
}

/**
 * Check if property meets Enhanced tier requirements (DOCUMENTS START HERE)
 */
function meetsEnhancedTier(p) {
  if (!meetsVerifiedTier(p)) return false;
  const hasDeed = !!p.deedUrl;
  const hasTaxRecord = !!p.propertyTaxRecordUrl;
  const hasHoaDocs = p.hasHOA === true ? !!p.hoaDocsUrl : true; // If no HOA, skip requirement
  const hasPricing = !!(p.estimatedWorth || p.makeMeMovePrice);
  const hasComps = Array.isArray(p.verifiedComps) && p.verifiedComps.length >= 1;
  return hasDeed && hasTaxRecord && hasHoaDocs && hasPricing && hasComps;
}

/**
 * Check if property meets Premium tier requirements
 */
function meetsPremiumTier(p) {
  if (!meetsEnhancedTier(p)) return false;
  const hasProPhotos = p.professionalPhotos === true || (p.photos?.length ?? 0) >= 10;
  const hasAdvancedAsset = !!(p.inspectionReportUrl || p.valuationDocUrl || p.matterportTourUrl || p.floorPlanUrl || p.compReportUrl);
  const hasDisclosures = !!p.disclosureFormsUrl;
  const hasDetailedDescription = !!(p.description && p.description.trim().length >= 300);
  return hasProPhotos && hasAdvancedAsset && hasDisclosures && hasDetailedDescription;
}

/**
 * Check if property meets Elite tier requirements
 */
function meetsEliteTier(p) {
  if (!meetsPremiumTier(p)) return false;
  const advancedAssets = [
    p.inspectionReportUrl,
    p.valuationDocUrl,
    p.matterportTourUrl,
    p.floorPlanUrl,
    p.compReportUrl,
  ].filter(Boolean).length;
  const hasMultipleAdvanced = advancedAssets >= 3;
  const hasProPhotosConfirmed = p.professionalPhotos === true;
  // Check for video/drone - check for video files array, video-related URLs, or videoDrone flag from pre-listing checklist
  const hasVideoOrDrone = !!(p.videoTourUrl || p.droneFootageUrl || (Array.isArray(p.videos) && p.videos.length > 0) || (Array.isArray(p.videoFiles) && p.videoFiles.length > 0) || p.videoDrone === true);
  const hasManyComps = Array.isArray(p.verifiedComps) && p.verifiedComps.length >= 3;
  const hasMortgageDocs = p.hasMortgage === true ? !!p.mortgageDocUrl : true; // If no mortgage, skip requirement
  // Video/drone is optional for now - can reach Elite without it, but it's a bonus
  return hasMultipleAdvanced && hasProPhotosConfirmed && hasManyComps && hasMortgageDocs;
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
    basic: 'Basic',
    complete: 'Complete',
    verified: 'Verified',
    enhanced: 'Enhanced',
    premium: 'Premium',
    elite: 'Elite',
  };
  return map[tier] || 'Basic';
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
  const featureCount = (p?.features?.length ?? 0);

  if (tier === 'basic') {
    const steps = [
      { done: !!(p?.bedrooms != null), label: 'Bedrooms' },
      { done: !!(p?.bathrooms != null), label: 'Bathrooms' },
      { done: !!(p?.squareFeet || p?.lotSize), label: 'Square feet or lot size' },
      { done: photoCount >= 3, label: `Photos (${photoCount}/3 minimum)` },
      { done: featureCount >= 2, label: `Features (${featureCount}/2 minimum)` },
      { done: !!(p?.estimatedWorth || p?.makeMeMovePrice), label: 'Pricing information' },
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
      { done: photoCount >= 5, label: `Photos (${photoCount}/5 minimum)` },
      { done: !!(p?.yearBuilt), label: 'Year built' },
      { done: !!(p?.squareFeet && p?.lotSize), label: 'Both square feet and lot size' },
      { done: descLength >= 200, label: `Description (${descLength}/200 characters)` },
      { done: featureCount >= 5, label: `Features (${featureCount}/5 minimum)` },
      { done: p?.hasHOA === true ? (p?.hoaFee != null) : (p?.hasHOA === false || p?.hoaFee != null), label: 'HOA information' },
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
      { done: !!p?.deedUrl, label: 'Deed (ownership confirmation)' },
      { done: !!p?.propertyTaxRecordUrl, label: 'Property tax record' },
      { done: p?.hasHOA === true ? !!p?.hoaDocsUrl : true, label: p?.hasHOA === true ? 'HOA documents' : 'HOA info (N/A)' },
      { done: !!(p?.estimatedWorth || p?.makeMeMovePrice), label: 'Estimated worth or make me move price' },
      { done: (p?.verifiedComps?.length ?? 0) >= 1, label: 'At least 1 verified comparable' },
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
      { done: p?.professionalPhotos === true || photoCount >= 10, label: 'Professional photos or 10+ photos' },
      { done: !!(p?.inspectionReportUrl || p?.valuationDocUrl || p?.matterportTourUrl || p?.floorPlanUrl || p?.compReportUrl), label: 'At least 1 advanced asset (inspection, floor plan, Matterport, valuation, comp report)' },
      { done: !!p?.disclosureFormsUrl, label: 'Disclosure forms' },
      { done: descLength >= 300, label: `Description (${descLength}/300 characters)` },
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
    const advancedAssets = [
      p?.inspectionReportUrl,
      p?.valuationDocUrl,
      p?.matterportTourUrl,
      p?.floorPlanUrl,
      p?.compReportUrl,
    ].filter(Boolean).length;
    const steps = [
      { done: advancedAssets >= 3, label: `Advanced assets (${advancedAssets}/3 minimum)` },
      { done: p?.professionalPhotos === true, label: 'Professional photos confirmed' },
      { done: !!(p?.videoTourUrl || p?.droneFootageUrl || (Array.isArray(p?.videos) && p.videos.length > 0) || (Array.isArray(p?.videoFiles) && p.videoFiles.length > 0) || p?.videoDrone === true), label: 'Video tour or drone footage (optional)' },
      { done: (p?.verifiedComps?.length ?? 0) >= 3, label: '3+ verified comparables' },
      { done: p?.hasMortgage === true ? !!p?.mortgageDocUrl : true, label: p?.hasMortgage === true ? 'Mortgage documents' : 'Mortgage info (N/A)' },
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
