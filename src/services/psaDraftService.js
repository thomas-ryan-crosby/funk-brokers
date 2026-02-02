// PSA draft service - save/resume/delete draft PSAs (e.g. when converting from LOI)
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

const DRAFTS_COLLECTION = 'psaDrafts';

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
 * Save a new PSA draft or update existing.
 * @param {object} data - { propertyId, buyerId, agreement, sourceLoiOfferId?, sourceLoi? }
 * @param {string} [draftId] - If provided, update this draft; otherwise create new.
 * @returns {Promise<string>} Draft document id
 */
export const savePsaDraft = async (data, draftId = null) => {
  const payload = sanitizeForFirestore({
    propertyId: data.propertyId,
    buyerId: data.buyerId,
    agreement: data.agreement,
    sourceLoiOfferId: data.sourceLoiOfferId ?? null,
    sourceLoi: data.sourceLoi ?? null,
    updatedAt: new Date(),
  });
  if (draftId) {
    const ref = doc(db, DRAFTS_COLLECTION, draftId);
    await updateDoc(ref, payload);
    return draftId;
  }
  payload.createdAt = new Date();
  const ref = await addDoc(collection(db, DRAFTS_COLLECTION), payload);
  return ref.id;
};

/**
 * Get all PSA drafts for a buyer.
 */
export const getPsaDraftsByBuyer = async (buyerId) => {
  const q = query(
    collection(db, DRAFTS_COLLECTION),
    where('buyerId', '==', buyerId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const at = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
    const bt = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
    return bt - at;
  });
  return list;
};

/**
 * Get a single draft by id.
 */
export const getPsaDraftById = async (draftId) => {
  const ref = doc(db, DRAFTS_COLLECTION, draftId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

/**
 * Delete a PSA draft.
 */
export const deletePsaDraft = async (draftId) => {
  await deleteDoc(doc(db, DRAFTS_COLLECTION, draftId));
};
