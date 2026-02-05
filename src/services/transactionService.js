// Transaction Service - Postgres API only (no Firebase)
import {
  getTransactionByOfferIdApi,
  getTransactionsByUserApi,
  getTransactionByIdApi,
  createTransactionApi,
  updateStepCompleteApi,
  setAssignedVendorApi,
} from './transactionApiService';

const toDate = (v) => {
  if (!v) return null;
  return v?.toDate ? v.toDate() : new Date(v);
};

/**
 * Build transaction steps from offer terms.
 * @param {object} offer - accepted offer
 * @param {Date} acceptedAt
 * @returns {Array<{ id, title, dueAt, completed, completedAt, required }>}
 */
function buildSteps(offer, acceptedAt) {
  const c = offer.contingencies || {};
  const closing = toDate(offer.proposedClosingDate) || new Date(acceptedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

  const steps = [];

  steps.push({
    id: 'earnest',
    title: 'Submit earnest money deposit',
    dueAt: addDays(acceptedAt, 5),
    completed: false,
    completedAt: null,
    required: true,
  });

  if (c.inspection?.included) {
    const days = c.inspection?.days || 10;
    steps.push({
      id: 'inspection',
      title: 'Schedule & complete inspection',
      dueAt: addDays(acceptedAt, days),
      completed: false,
      completedAt: null,
      required: true,
    });
  }

  if (c.financing?.included) {
    const days = c.financing?.days || 30;
    steps.push({
      id: 'financing',
      title: 'Obtain financing approval',
      dueAt: addDays(acceptedAt, days),
      completed: false,
      completedAt: null,
      required: true,
    });
  }

  if (c.appraisal?.included) {
    const days = c.financing?.included ? (c.financing?.days || 30) : 21;
    steps.push({
      id: 'appraisal',
      title: 'Complete appraisal',
      dueAt: addDays(acceptedAt, days),
      completed: false,
      completedAt: null,
      required: true,
    });
  }

  if (c.homeSale?.included) {
    steps.push({
      id: 'home_sale',
      title: "Close on sale of buyer's current home",
      dueAt: closing,
      completed: false,
      completedAt: null,
      required: true,
    });
  }

  steps.push({
    id: 'closing',
    title: 'Closing',
    dueAt: closing,
    completed: false,
    completedAt: null,
    required: true,
  });

  return steps;
}

/**
 * Create a transaction when an offer is accepted. Idempotent: skips if one exists for offerId.
 * @param {object} offer - full offer (from getOfferById)
 * @param {object} property - full property (from getPropertyById) for sellerId
 * @param {object} [opts] - optional: { acceptedAt: Date|Timestamp } for backfill (default: now)
 * @returns {Promise<string|null>} transaction id or null if skipped (duplicate)
 */
export const createTransaction = async (offer, property, opts = {}) => {
  if (offer.offerType === 'loi') return null;

  const existing = await getTransactionByOfferIdApi(offer.id);
  if (existing) return null;

  let acceptedAt = new Date();
  if (opts.acceptedAt) {
    const d = opts.acceptedAt?.toDate ? opts.acceptedAt.toDate() : new Date(opts.acceptedAt);
    if (!Number.isNaN(d.getTime())) acceptedAt = d;
  }
  const buyerId = offer.buyerId;
  const sellerId = property?.sellerId || null;
  const parties = [buyerId, sellerId].filter(Boolean);

  const payload = {
    offerId: offer.id,
    propertyId: offer.propertyId,
    offerType: offer.offerType ?? 'psa',
    buyerId,
    buyerName: offer.buyerName || null,
    buyerEmail: offer.buyerEmail || null,
    buyerPhone: offer.buyerPhone || null,
    sellerId: sellerId || null,
    parties,
    offerAmount: offer.offerAmount ?? null,
    earnestMoney: offer.earnestMoney ?? null,
    proposedClosingDate: offer.proposedClosingDate ?? null,
    financingType: offer.financingType || null,
    contingencies: offer.contingencies || {},
    acceptedAt,
    status: 'active',
    steps: buildSteps(offer, acceptedAt),
    disclosureAcknowledgedAt: offer.disclosureAcknowledgedAt ?? null,
    disclosureAcknowledgedByName: offer.disclosureAcknowledgedByName ?? null,
    createdAt: acceptedAt,
    updatedAt: acceptedAt,
  };

  const id = await createTransactionApi(payload);
  return id;
};

/**
 * Get transaction by offerId (for idempotent create).
 */
export const getTransactionByOfferId = async (offerId) => {
  return getTransactionByOfferIdApi(offerId);
};

/**
 * Get all transactions for a user (as buyer or seller). PSA only.
 */
export const getTransactionsByUser = async (userId) => {
  return getTransactionsByUserApi(userId);
};

/**
 * Get a single transaction by ID.
 */
export const getTransactionById = async (transactionId) => {
  return getTransactionByIdApi(transactionId);
};

/**
 * Mark a step complete or incomplete.
 */
export const updateStepComplete = async (transactionId, stepId, completed) => {
  return updateStepCompleteApi(transactionId, stepId, completed);
};

/**
 * Assign or unassign a vendor to a transaction role.
 */
export const setAssignedVendor = async (transactionId, role, vendorId) => {
  return setAssignedVendorApi(transactionId, role, vendorId);
};
