// Listing Progress Service - Firestore operations for saving listing progress
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

const LISTING_PROGRESS_COLLECTION = 'listingProgress';

/**
 * Get listing progress for a property
 * @param {string} propertyId
 * @returns {Promise<object|null>}
 */
export const getListingProgress = async (propertyId) => {
  if (!propertyId) return null;
  try {
    const ref = doc(db, LISTING_PROGRESS_COLLECTION, propertyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Error fetching listing progress:', err);
    throw err;
  }
};

/**
 * Save listing progress for a property
 * @param {string} propertyId
 * @param {object} progressData - { step, formData, completedSteps }
 */
export const saveListingProgress = async (propertyId, progressData) => {
  if (!propertyId) throw new Error('propertyId is required');
  try {
    const ref = doc(db, LISTING_PROGRESS_COLLECTION, propertyId);
    await setDoc(ref, {
      ...progressData,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving listing progress:', err);
    throw err;
  }
};

/**
 * Calculate listing readiness percentage
 * @param {object} formData - property form data
 * @returns {number} percentage 0-100
 */
export const calculateListingReadiness = (property) => {
  if (!property) return 0;
  
  let completedFields = 0;
  let totalFields = 0;
  
  // Step 1: Address (4 fields)
  const addressFields = ['address', 'city', 'state', 'zipCode'];
  totalFields += addressFields.length;
  addressFields.forEach((field) => {
    if (property[field] && String(property[field]).trim()) completedFields++;
  });
  
  // Step 2: Property details (3 fields)
  const detailFields = ['propertyType', 'bedrooms', 'bathrooms'];
  totalFields += detailFields.length;
  detailFields.forEach((field) => {
    if (property[field] != null && property[field] !== '') completedFields++;
  });
  
  // Step 3: Price (required)
  totalFields++;
  if (property.price != null && property.price > 0) completedFields++;
  
  // Step 4: Photos (recommended - weighted 0.5)
  totalFields += 0.5;
  if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
    completedFields += 0.5;
  }
  
  // Description (bonus - weighted 0.5)
  totalFields += 0.5;
  if (property.description && String(property.description).trim().length > 50) {
    completedFields += 0.5;
  }
  
  return Math.min(100, Math.round((completedFields / totalFields) * 100));
};
