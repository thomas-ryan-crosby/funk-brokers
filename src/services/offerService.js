// Offer Service - Firestore operations for offers
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
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
 * Get all offers for a property
 */
export const getOffersByProperty = async (propertyId) => {
  try {
    const q = query(
      collection(db, OFFERS_COLLECTION),
      where('propertyId', '==', propertyId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const offers = [];
    querySnapshot.forEach((doc) => {
      offers.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return offers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
};

/**
 * Get all offers by a buyer
 */
export const getOffersByBuyer = async (buyerId) => {
  try {
    const q = query(
      collection(db, OFFERS_COLLECTION),
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const offers = [];
    querySnapshot.forEach((doc) => {
      offers.push({
        id: doc.id,
        ...doc.data(),
      });
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
