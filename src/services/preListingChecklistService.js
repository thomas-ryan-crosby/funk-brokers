// Pre-Listing Checklist Service - Firestore operations for pre-listing checklist completion
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PRE_LISTING_CHECKLISTS_COLLECTION = 'preListingChecklists';

/**
 * Get pre-listing checklist for a user (one per user, not per property)
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export const getPreListingChecklist = async (userId) => {
  if (!userId) return null;
  try {
    const q = query(
      collection(db, PRE_LISTING_CHECKLISTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch (err) {
    console.error('Error fetching pre-listing checklist:', err);
    throw err;
  }
};

/**
 * Create or update pre-listing checklist
 * @param {string} userId
 * @param {object} data - checklist data
 */
export const savePreListingChecklist = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const existing = await getPreListingChecklist(userId);
    if (existing) {
      const ref = doc(db, PRE_LISTING_CHECKLISTS_COLLECTION, existing.id);
      await updateDoc(ref, { ...data, updatedAt: new Date() });
      return existing.id;
    } else {
      const ref = await addDoc(collection(db, PRE_LISTING_CHECKLISTS_COLLECTION), {
        userId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return ref.id;
    }
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
