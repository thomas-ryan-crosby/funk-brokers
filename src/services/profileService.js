// Profile Service - Firestore operations for sale and purchase profiles
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SALE_PROFILES = 'saleProfiles';
const PURCHASE_PROFILES = 'purchaseProfiles';
const SAVED_SEARCHES = 'savedSearches';

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

/**
 * Update specific purchase profile fields (supports deleteField).
 * @param {string} userId
 * @param {object} data
 */
export const updatePurchaseProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const ref = doc(db, PURCHASE_PROFILES, userId);
    await updateDoc(ref, { ...data, updatedAt: new Date() });
  } catch (err) {
    console.error('Error updating purchase profile:', err);
    throw err;
  }
};

/**
 * Get all saved searches for a user (newest first)
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, name: string, filters: object, createdAt: Date }>>}
 */
const SAVED_SEARCHES_CAP = 50;

export const getSavedSearches = async (userId) => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, SAVED_SEARCHES),
      where('userId', '==', userId),
      limit(SAVED_SEARCHES_CAP)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => {
      list.push({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
      });
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  } catch (err) {
    console.error('Error fetching saved searches:', err);
    throw err;
  }
};

/**
 * Add a saved search for a user
 * @param {string} userId
 * @param {object} params - { name: string, filters: object }
 * @returns {Promise<string>} document id
 */
export const addSavedSearch = async (userId, { name, filters }) => {
  if (!userId) throw new Error('userId is required');
  try {
    const ref = await addDoc(collection(db, SAVED_SEARCHES), {
      userId,
      name: name || 'My search',
      filters: filters || {},
      createdAt: new Date(),
    });
    return ref.id;
  } catch (err) {
    console.error('Error saving search:', err);
    throw err;
  }
};

/**
 * Remove a saved search (caller must ensure the search belongs to the user; enforce via Firestore rules)
 * @param {string} searchId
 */
export const removeSavedSearch = async (searchId) => {
  if (!searchId) throw new Error('searchId is required');
  try {
    await deleteDoc(doc(db, SAVED_SEARCHES, searchId));
  } catch (err) {
    console.error('Error removing saved search:', err);
    throw err;
  }
};
