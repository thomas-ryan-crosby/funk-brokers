// Message Service - Firestore operations for internal messaging
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const MESSAGES_COLLECTION = 'messages';
/** Max messages read per query (Firestore cost control). */
const MESSAGES_QUERY_LIMIT = 200;

/**
 * Create a new message.
 * @param {{ senderId: string, senderName: string, recipientId: string, recipientName: string, propertyId?: string, propertyAddress?: string, body: string }}
 */
export const createMessage = async ({ senderId, senderName, recipientId, recipientName, propertyId = null, propertyAddress = null, body }) => {
  const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
    senderId,
    senderName: senderName || null,
    recipientId,
    recipientName: recipientName || null,
    propertyId: propertyId || null,
    propertyAddress: propertyAddress || null,
    body: String(body || '').trim(),
    createdAt: new Date(),
  });
  return docRef.id;
};

/**
 * Get all messages for a user (sent or received). Merges two queries and sorts by createdAt desc.
 * Capped at MESSAGES_QUERY_LIMIT per query (Firestore cost control).
 */
export const getMessagesForUser = async (uid) => {
  const [recvSnap, sendSnap] = await Promise.all([
    getDocs(query(
      collection(db, MESSAGES_COLLECTION),
      where('recipientId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_QUERY_LIMIT)
    )),
    getDocs(query(
      collection(db, MESSAGES_COLLECTION),
      where('senderId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_QUERY_LIMIT)
    )),
  ]);
  const map = new Map();
  const add = (d) => {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() });
  };
  recvSnap.forEach((d) => add(d));
  sendSnap.forEach((d) => add(d));
  const list = Array.from(map.values());
  list.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });
  return list;
};
