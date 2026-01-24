// Offer Service - Firestore operations for offers
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const OFFERS_COLLECTION = 'offers';

/**
 * Create a new offer
 */
export const createOffer = async (offerData) => {
  try {
    const docRef = await addDoc(collection(db, OFFERS_COLLECTION), {
      ...offerData,
      status: 'pending', // pending, accepted, rejected, countered, withdrawn
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

/**
 * Get all offers for a property.
 * Uses where-only query (no orderBy) to avoid composite index; sorts by createdAt client-side.
 */
export const getOffersByProperty = async (propertyId) => {
  try {
    const q = query(
      collection(db, OFFERS_COLLECTION),
      where('propertyId', '==', propertyId)
    );
    const querySnapshot = await getDocs(q);
    const offers = [];
    querySnapshot.forEach((d) => {
      offers.push({ id: d.id, ...d.data() });
    });
    offers.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    return offers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
};

/**
 * Get all offers by a buyer.
 * Uses where-only query (no orderBy) to avoid composite index; sorts by createdAt client-side.
 */
export const getOffersByBuyer = async (buyerId) => {
  try {
    const q = query(
      collection(db, OFFERS_COLLECTION),
      where('buyerId', '==', buyerId)
    );
    const querySnapshot = await getDocs(q);
    const offers = [];
    querySnapshot.forEach((d) => {
      offers.push({ id: d.id, ...d.data() });
    });
    offers.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    return offers;
  } catch (error) {
    console.error('Error fetching buyer offers:', error);
    throw error;
  }
};

/**
 * Get a single offer by ID
 */
export const getOfferById = async (offerId) => {
  try {
    const docRef = doc(db, OFFERS_COLLECTION, offerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error('Offer not found');
    }
  } catch (error) {
    console.error('Error fetching offer:', error);
    throw error;
  }
};

/**
 * Update offer status
 */
export const updateOfferStatus = async (offerId, status, additionalData = {}) => {
  try {
    const docRef = doc(db, OFFERS_COLLECTION, offerId);
    await updateDoc(docRef, {
      status,
      ...additionalData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    throw error;
  }
};

/**
 * Accept an offer
 */
export const acceptOffer = async (offerId) => {
  try {
    // Update offer status
    await updateOfferStatus(offerId, 'accepted');
    
    // Update property status to under_contract
    const offer = await getOfferById(offerId);
    if (offer.propertyId) {
      const { updateProperty } = await import('./propertyService');
      await updateProperty(offer.propertyId, { status: 'under_contract' });
    }
  } catch (error) {
    console.error('Error accepting offer:', error);
    throw error;
  }
};

/**
 * Reject an offer
 */
export const rejectOffer = async (offerId) => {
  try {
    await updateOfferStatus(offerId, 'rejected');
  } catch (error) {
    console.error('Error rejecting offer:', error);
    throw error;
  }
};

/**
 * Withdraw an offer
 */
export const withdrawOffer = async (offerId) => {
  try {
    await updateOfferStatus(offerId, 'withdrawn');
  } catch (error) {
    console.error('Error withdrawing offer:', error);
    throw error;
  }
};
