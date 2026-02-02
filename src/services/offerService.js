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
 * Recursively remove undefined values so Firestore accepts the payload.
 */
function sanitizeForFirestore(obj) {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore).filter((v) => v !== undefined);
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      const s = sanitizeForFirestore(v);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return obj;
}

/**
 * Create a new offer
 */
export const createOffer = async (offerData) => {
  try {
    const sanitized = sanitizeForFirestore({
      ...offerData,
      status: 'pending', // pending, accepted, rejected, countered, withdrawn
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const docRef = await addDoc(collection(db, OFFERS_COLLECTION), sanitized);
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
 * Accept an offer. For PSA: updates status, property to under_contract, creates transaction.
 * For LOI: updates status and property only; no transaction (user is prompted to convert LOI to PSA).
 */
export const acceptOffer = async (offerId) => {
  try {
    await updateOfferStatus(offerId, 'accepted');

    const offer = await getOfferById(offerId);
    if (offer.propertyId) {
      const { updateProperty, getPropertyById } = await import('./propertyService');
      await updateProperty(offer.propertyId, { status: 'under_contract' });
      // Only create transaction for PSA; LOI flow prompts user to convert to PSA
      if (offer.offerType !== 'loi') {
        const property = await getPropertyById(offer.propertyId).catch(() => null);
        const { createTransaction } = await import('./transactionService');
        await createTransaction(offer, property || {});
      }
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

/**
 * Map form-style contingencies to offer document shape.
 */
function toContingencies(form) {
  return {
    inspection: { included: !!form.inspectionContingency, days: form.inspectionContingency ? parseInt(form.inspectionDays, 10) || null : null },
    financing: { included: !!form.financingContingency, days: form.financingContingency ? parseInt(form.financingDays, 10) || null : null },
    appraisal: { included: !!form.appraisalContingency, paidBy: form.appraisalContingency ? (form.appraisalPaidBy || 'buyer') : null },
    homeSale: { included: !!form.homeSaleContingency },
  };
}

function toSellerConcessions(form) {
  const pct = form.sellerConcessionsPercent !== '' && form.sellerConcessionsPercent != null && Number.isFinite(parseFloat(form.sellerConcessionsPercent));
  const amt = form.sellerConcessionsAmount !== '' && form.sellerConcessionsAmount != null && Number.isFinite(parseFloat(form.sellerConcessionsAmount));
  return pct ? { type: 'percent', value: parseFloat(form.sellerConcessionsPercent) } : amt ? { type: 'amount', value: parseFloat(form.sellerConcessionsAmount) } : null;
}

/**
 * Counter an offer (seller counters buyer's offer, or buyer counters seller's counter).
 * @param {string} originalOfferId - The offer being countered
 * @param {object} counterData - Form data: offerAmount, earnestMoney, closingDate, financingType,
 *   inspectionContingency, inspectionDays, financingContingency, financingDays,
 *   appraisalContingency, homeSaleContingency, message
 * @param {object} opts - { userId: string } (current user's uid)
 * @returns {Promise<string>} The new offer's id
 */
export const counterOffer = async (originalOfferId, counterData, { userId }) => {
  if (!userId) throw new Error('userId is required');
  const original = await getOfferById(originalOfferId);
  const { getPropertyById } = await import('./propertyService');
  const property = await getPropertyById(original.propertyId).catch(() => null);
  if (!property) throw new Error('Property not found');

  const isSeller = property.sellerId === userId;
  const isBuyer = original.buyerId === userId;
  if (!isSeller && !isBuyer) throw new Error('Only the seller or the buyer may counter this offer');

  const closing = counterData.closingDate ? new Date(counterData.closingDate) : (original.proposedClosingDate?.toDate ? original.proposedClosingDate.toDate() : new Date(original.proposedClosingDate || Date.now()));

  const finType = counterData.financingType || original.financingType || 'conventional';
  const sellerConv = toSellerConcessions(counterData) ?? original.sellerConcessions ?? null;
  const newOffer = {
    propertyId: original.propertyId,
    buyerId: original.buyerId,
    buyerName: original.buyerName || null,
    buyerEmail: original.buyerEmail || null,
    buyerPhone: original.buyerPhone || null,
    verificationDocuments: original.verificationDocuments || {},
    offerAmount: parseFloat(counterData.offerAmount) || original.offerAmount,
    earnestMoney: parseFloat(counterData.earnestMoney) != null && !Number.isNaN(parseFloat(counterData.earnestMoney)) ? parseFloat(counterData.earnestMoney) : original.earnestMoney,
    earnestMoneyForm: counterData.earnestMoneyForm ?? original.earnestMoneyForm ?? null,
    earnestMoneyDepositedWith: counterData.earnestMoneyDepositedWith ?? original.earnestMoneyDepositedWith ?? null,
    earnestMoneyDue: counterData.earnestMoneyDue ?? original.earnestMoneyDue ?? null,
    proposedClosingDate: closing,
    financingType: finType,
    downPayment: (finType === 'cash' || ['assumption', 'seller_carryback'].includes(finType)) ? null : (counterData.downPayment !== undefined && counterData.downPayment !== '' && Number.isFinite(parseFloat(counterData.downPayment)) ? parseFloat(counterData.downPayment) : (original.downPayment ?? null)),
    sellerConcessions: sellerConv,
    possession: counterData.possession || original.possession || null,
    contingencies: toContingencies(counterData),
    inclusions: counterData.inclusions != null ? (String(counterData.inclusions).trim() || null) : (original.inclusions || null),
    offerExpirationDate: (counterData.offerExpirationDate != null && String(counterData.offerExpirationDate).trim()) ? String(counterData.offerExpirationDate).trim() : (original.offerExpirationDate || null),
    offerExpirationTime: (counterData.offerExpirationTime != null && String(counterData.offerExpirationTime).trim()) ? String(counterData.offerExpirationTime).trim() : (original.offerExpirationTime || null),
    message: counterData.message != null ? String(counterData.message) : (original.message || ''),
    counterToOfferId: originalOfferId,
    createdBy: userId,
  };

  const newId = await createOffer(newOffer);
  await updateOfferStatus(originalOfferId, 'countered', { counteredByOfferId: newId });
  return newId;
};
