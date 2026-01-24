// Profile Service - Firestore operations for sale and purchase profiles
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SALE_PROFILES = 'saleProfiles';
const PURCHASE_PROFILES = 'purchaseProfiles';

/**
 * Get the sale profile for a user
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export const getSaleProfile = async (userId) => {
  if (!userId) return null;
  try {
    const ref = doc(db, SALE_PROFILES, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error('Error fetching sale profile:', err);
    throw err;
  }
};

/**
 * Create or update the sale profile for a user
 * @param {string} userId
 * @param {object} data
 */
export const setSaleProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const ref = doc(db, SALE_PROFILES, userId);
    await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
  } catch (err) {
    console.error('Error saving sale profile:', err);
    throw err;
  }
};

/**
 * Get the purchase profile for a user
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export const getPurchaseProfile = async (userId) => {
  if (!userId) return null;
  try {
    const ref = doc(db, PURCHASE_PROFILES, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error('Error fetching purchase profile:', err);
    throw err;
  }
};

/**
 * Create or update the purchase profile for a user
 * @param {string} userId
 * @param {object} data
 */
export const setPurchaseProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const ref = doc(db, PURCHASE_PROFILES, userId);
    await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
  } catch (err) {
    console.error('Error saving purchase profile:', err);
    throw err;
  }
};
