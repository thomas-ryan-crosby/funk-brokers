// Transaction Service - Firestore operations for post-acceptance deal steps
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TRANSACTIONS_COLLECTION = 'transactions';

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

  // 1. Earnest money – always
  steps.push({
    id: 'earnest',
    title: 'Submit earnest money deposit',
    dueAt: addDays(acceptedAt, 5),
    completed: false,
    completedAt: null,
    required: true,
  });

  // 2. Inspection – if contingency included
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

  // 3. Financing – if contingency included
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

  // 4. Appraisal – if contingency included
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

  // 5. Home sale contingency – if included
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

  // 6. Closing – always
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
  const existing = await getTransactionByOfferId(offer.id);
  if (existing) return null;

  let acceptedAt = new Date();
  if (opts.acceptedAt) {
    const d = opts.acceptedAt?.toDate ? opts.acceptedAt.toDate() : new Date(opts.acceptedAt);
    if (!Number.isNaN(d.getTime())) acceptedAt = d;
  }
  const buyerId = offer.buyerId;
  const sellerId = property?.sellerId || null;
  const parties = [buyerId, sellerId].filter(Boolean);

  const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
    offerId: offer.id,
    propertyId: offer.propertyId,
    buyerId: offer.buyerId,
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
    createdAt: acceptedAt,
    updatedAt: acceptedAt,
  });
  return docRef.id;
};

/**
 * Get transaction by offerId (for idempotent create).
 */
export const getTransactionByOfferId = async (offerId) => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('offerId', '==', offerId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/**
 * Get all transactions for a user (as buyer or seller).
 */
export const getTransactionsByUser = async (userId) => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('parties', 'array-contains', userId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  list.sort((a, b) => {
    const aDate = toDate(a.acceptedAt) || new Date(0);
    const bDate = toDate(b.acceptedAt) || new Date(0);
    return bDate - aDate;
  });
  return list;
};

/**
 * Get a single transaction by ID.
 */
export const getTransactionById = async (transactionId) => {
  const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
};

/**
 * Mark a step complete or incomplete.
 * @param {string} transactionId
 * @param {string} stepId
 * @param {boolean} completed
 */
export const updateStepComplete = async (transactionId, stepId, completed) => {
  const t = await getTransactionById(transactionId);
  if (!t || !t.steps) throw new Error('Transaction or steps not found');
  const steps = t.steps.map((s) => {
    if (s.id !== stepId) return s;
    return {
      ...s,
      completed: !!completed,
      completedAt: completed ? new Date() : null,
    };
  });
  const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
  await updateDoc(ref, { steps, updatedAt: new Date() });
};
