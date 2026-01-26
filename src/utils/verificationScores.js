/**
 * Verification and listing tier scoring.
 *
 * Verified Buyer Score: 0–100 from purchase profile completeness; 100 when buyerVerified.
 *
 * Listing tiers (Property):
 * - Generic: missing key info (owner/deed, unconfirmed sqft, no/minimal photos).
 * - Verified: photos (5+), confirmed ownership (deed), core docs.
 * - Premium: Verified + advanced data (Matterport, floor plans, inspection report, comp/valuation, professional photos).
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
  if (profile.buyerVerified) return { score: 100, label: 'Verified' };

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
 * @param {object} p - property
 * @returns {'generic'|'verified'|'premium'}
 */
export function getListingTier(p) {
  if (!p) return 'generic';

  const hasDeed = !!p.deedUrl;
  const photoCount = p.photos?.length ?? 0;
  const hasEnoughPhotos = photoCount >= 5;

  // Generic: missing key info — no deed (confirmed ownership), or no/minimal photos
  if (!hasDeed || !hasEnoughPhotos) return 'generic';

  // Verified: deed, 5+ photos; or explicitly verified via Get Verified flow
  const isVerified = p.verified === true || (hasDeed && hasEnoughPhotos);

  // Premium: verified + at least one advanced asset
  const hasInspection = !!p.inspectionReportUrl;
  const hasValuation = !!p.valuationDocUrl;
  const hasMatterport = !!p.matterportTourUrl;
  const hasFloorPlan = !!p.floorPlanUrl;
  const hasCompReport = !!p.compReportUrl;
  const hasProPhotos = p.professionalPhotos === true;

  const hasAdvanced = hasInspection || hasValuation || hasMatterport || hasFloorPlan || hasCompReport || hasProPhotos;

  if (isVerified && hasAdvanced) return 'premium';
  if (isVerified) return 'verified';
  return 'generic';
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
 * @param {'generic'|'verified'|'premium'} tier
 * @returns {string}
 */
export function getListingTierLabel(tier) {
  const map = { generic: 'Generic', verified: 'Verified', premium: 'Premium' };
  return map[tier] || 'Generic';
}

/**
 * Progress toward the next listing tier. For use on Property Detail.
 * @param {object} p - property
 * @returns {{ tier: 'generic'|'verified'|'premium', nextTier: string|null, percentage: number, missingItems: string[] }}
 */
export function getListingTierProgress(p) {
  const tier = getListingTier(p);
  const photoCount = p?.photos?.length ?? 0;
  const hasDeed = !!p?.deedUrl;
  const hasEnoughPhotos = photoCount >= 5;

  if (tier === 'generic') {
    const steps = [
      { done: hasDeed, label: 'Deed (confirmed ownership)' },
      { done: hasEnoughPhotos, label: `Photos (${photoCount}/5 minimum)` },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missingItems = steps.filter((s) => !s.done).map((s) => s.label);
    return {
      tier: 'generic',
      nextTier: 'Verified',
      percentage: Math.round((completed / 2) * 100),
      missingItems,
    };
  }

  if (tier === 'verified') {
    const advanced = [
      { has: !!p?.inspectionReportUrl, label: 'Inspection report' },
      { has: !!p?.valuationDocUrl, label: 'Valuation / CMA' },
      { has: !!p?.matterportTourUrl, label: 'Matterport tour' },
      { has: !!p?.floorPlanUrl, label: 'Floor plan' },
      { has: !!p?.compReportUrl, label: 'Comp report' },
      { has: p?.professionalPhotos === true, label: 'Professional photos' },
    ];
    const hasAny = advanced.some((a) => a.has);
    const missingItems = advanced.filter((a) => !a.has).map((a) => a.label);
    const completed = advanced.filter((a) => a.has).length;
    return {
      tier: 'verified',
      nextTier: 'Premium',
      percentage: hasAny ? 100 : Math.round((completed / 6) * 100),
      missingItems: hasAny ? [] : missingItems,
    };
  }

  return {
    tier: 'premium',
    nextTier: null,
    percentage: 100,
    missingItems: [],
  };
}
