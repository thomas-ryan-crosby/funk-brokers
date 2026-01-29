// Pre-Listing Checklist Service - Firestore operations for pre-listing checklist (one per property)
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const PRE_LISTING_CHECKLISTS_COLLECTION = 'preListingChecklists';

/**
 * Get pre-listing checklist for a property (one checklist per property)
 * @param {string} propertyId
 * @returns {Promise<object|null>}
 */
export const getPreListingChecklist = async (propertyId) => {
  if (!propertyId) return null;
  try {
    const ref = doc(db, PRE_LISTING_CHECKLISTS_COLLECTION, propertyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Error fetching pre-listing checklist:', err);
    throw err;
  }
};

/**
 * Create or update pre-listing checklist for a property
 * @param {string} propertyId
 * @param {object} data - checklist data
 */
export const savePreListingChecklist = async (propertyId, data) => {
  if (!propertyId) throw new Error('propertyId is required');
  try {
    const ref = doc(db, PRE_LISTING_CHECKLISTS_COLLECTION, propertyId);
    await setDoc(ref, {
      propertyId,
      ...data,
      updatedAt: new Date(),
    }, { merge: true });
    return propertyId;
  } catch (err) {
    console.error('Error saving pre-listing checklist:', err);
    throw err;
  }
};

/**
 * Check if all required steps are complete
 * @param {object} checklist
 * @returns {boolean}
 */
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
