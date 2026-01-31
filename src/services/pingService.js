// Ping Service - lightweight property pings
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PINGS_COLLECTION = 'pings';

/**
 * Create a new ping.
 * @param {{ propertyId: string, propertyAddress?: string, sellerId: string, senderId: string, senderName: string, reasonType: string, note?: string }}
 */
export const createPing = async ({
  propertyId,
  propertyAddress,
  sellerId,
  senderId,
  senderName,
  reasonType,
  note,
}) => {
  if (!propertyId || !sellerId || !senderId) throw new Error('Missing ping fields');
  const docRef = await addDoc(collection(db, PINGS_COLLECTION), {
    propertyId,
    propertyAddress: propertyAddress || null,
    sellerId,
    senderId,
    senderName: senderName || 'Anonymous',
    reasonType,
    note: note ? String(note).trim() : null,
    status: 'new',
    createdAt: new Date(),
  });
  return docRef.id;
};

/**
 * Get all pings for a seller.
 * @param {string} sellerId
 * @returns {Promise<Array>}
 */
export const getPingsForSeller = async (sellerId) => {
  if (!sellerId) return [];
  const q = query(
    collection(db, PINGS_COLLECTION),
    where('sellerId', '==', sellerId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};
