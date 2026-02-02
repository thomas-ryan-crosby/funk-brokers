import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';

const FEEDBACK_COLLECTION = 'feedback';

/**
 * Submit feedback or a bug report (beta testers).
 * @param {Object} data - { userId, authorName?, body, type: 'bug'|'feedback'|'other', section? }
 * @returns {Promise<string>} document id
 */
export const createFeedback = async (data) => {
  const payload = {
    userId: data.userId || null,
    authorName: data.authorName || null,
    body: (data.body || '').trim(),
    type: data.type || 'feedback',
    section: (data.section || '').trim() || null,
    createdAt: new Date(),
  };
  const ref = await addDoc(collection(db, FEEDBACK_COLLECTION), payload);
  return ref.id;
};

/**
 * Get all submitted feedback, newest first (for team and beta testers to view).
 * @param {number} limitCount - max items (default 100)
 * @returns {Promise<Array<{ id, userId, authorName, body, type, createdAt }>>}
 */
export const getFeedbackList = async (limitCount = 100) => {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    if (list.length < limitCount) list.push({ id: d.id, ...d.data() });
  });
  return list;
};
