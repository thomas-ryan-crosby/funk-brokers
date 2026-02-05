// Pre-Listing Checklist Service - Postgres API only (Firestore removed)
import { getPreListingChecklistApi, savePreListingChecklistApi } from './preListingChecklistApiService';

export const getPreListingChecklist = async (propertyId) => {
  if (!propertyId) return null;
  try {
    const data = await getPreListingChecklistApi(propertyId);
    if (!data) return null;
    return { id: data.propertyId, ...data };
  } catch (err) {
    console.error('Error fetching pre-listing checklist:', err);
    throw err;
  }
};

export const savePreListingChecklist = async (propertyId, data) => {
  if (!propertyId) throw new Error('propertyId is required');
  try {
    await savePreListingChecklistApi(propertyId, { propertyId, ...data });
    return propertyId;
  } catch (err) {
    console.error('Error saving pre-listing checklist:', err);
    throw err;
  }
};

export const isPreListingChecklistComplete = (checklist) => {
  if (!checklist) return false;
  return (
    checklist.step1LegalAuthority?.completed === true &&
    checklist.step2TitleOwnership?.completed === true &&
    checklist.step3ListingStrategy?.completed === true &&
    checklist.step4Disclosures?.completed === true &&
    checklist.step5PropertyPrep?.completed === true &&
    checklist.step6MarketingAssets?.completed === true &&
    checklist.step7ShowingsOffers?.completed === true
  );
};
