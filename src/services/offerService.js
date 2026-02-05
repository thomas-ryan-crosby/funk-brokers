// Offer Service - Postgres API only (Firestore removed)
import {
  getOffersByPropertyApi,
  getOffersByBuyerApi,
  getOfferByIdApi,
  createOfferApi,
  updateOfferStatusApi,
} from './offersApiService';

function sanitizeForPayload(obj) {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForPayload).filter((v) => v !== undefined);
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      const s = sanitizeForPayload(v);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return obj;
}

export const createOffer = async (offerData) => {
  return createOfferApi(offerData);
};

export const getOffersByProperty = async (propertyId) => {
  return getOffersByPropertyApi(propertyId);
};

export const getOffersByBuyer = async (buyerId) => {
  return getOffersByBuyerApi(buyerId);
};

export const getOfferById = async (offerId) => {
  return getOfferByIdApi(offerId);
};

export const updateOfferStatus = async (offerId, status, additionalData = {}) => {
  await updateOfferStatusApi(offerId, status, additionalData);
};

export const acceptOffer = async (offerId) => {
  await updateOfferStatusApi(offerId, 'accepted');
  const offer = await getOfferByIdApi(offerId);
  if (offer?.propertyId) {
    const { updateProperty, getPropertyById } = await import('./propertyService');
    if (offer.offerType !== 'loi') {
      await updateProperty(offer.propertyId, { status: 'under_contract' });
      const property = await getPropertyById(offer.propertyId).catch(() => null);
      const { createTransaction } = await import('./transactionService');
      await createTransaction(offer, property || {});
    }
  }
};

export const rejectOffer = async (offerId) => {
  await updateOfferStatusApi(offerId, 'rejected');
};

export const withdrawOffer = async (offerId) => {
  await updateOfferStatusApi(offerId, 'withdrawn');
};

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

export const counterOffer = async (originalOfferId, counterData, { userId }) => {
  if (!userId) throw new Error('userId is required');
  const original = await getOfferByIdApi(originalOfferId);
  const { getPropertyById } = await import('./propertyService');
  const property = await getPropertyById(original.propertyId).catch(() => null);
  if (!property) throw new Error('Property not found');
  const isSeller = property.sellerId === userId;
  const isBuyer = original.buyerId === userId;
  if (!isSeller && !isBuyer) throw new Error('Only the seller or the buyer may counter this offer');

  if (counterData.isLoiCounter && counterData.loi) {
    const loi = sanitizeForPayload(counterData.loi);
    const purchasePrice = loi?.economic_terms?.purchase_price ?? original.offerAmount ?? 0;
    const newOffer = {
      offerType: 'loi',
      loi,
      propertyId: original.propertyId,
      buyerId: original.buyerId,
      buyerName: original.buyerName ?? loi?.parties?.buyer_name ?? null,
      buyerEmail: original.buyerEmail || null,
      buyerPhone: original.buyerPhone || null,
      verificationDocuments: original.verificationDocuments || {},
      offerAmount: purchasePrice,
      counterToOfferId: originalOfferId,
      createdBy: userId,
    };
    const newId = await createOfferApi(newOffer);
    await updateOfferStatusApi(originalOfferId, 'countered', { counteredByOfferId: newId });
    return newId;
  }

  const closing = counterData.closingDate ? new Date(counterData.closingDate) : (original.proposedClosingDate ? new Date(original.proposedClosingDate) : new Date(original.proposedClosingDate || Date.now()));
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
  const newId = await createOfferApi(newOffer);
  await updateOfferStatusApi(originalOfferId, 'countered', { counteredByOfferId: newId });
  return newId;
};
