import { addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { get as cacheGet, set as cacheSet, remove as cacheRemove } from '../utils/ttlCache';

const FEEDBACK_COLLECTION = 'feedback';
const FEEDBACK_LIST_CACHE_KEY = 'feedback_list';
const FEEDBACK_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min – Tier 2

/**
 * Submit feedback or a bug report (beta testers).
 * Invalidates feedback list cache so next load shows the new item.
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
  cacheRemove(FEEDBACK_LIST_CACHE_KEY);
  return ref.id;
};

/**
 * Get all submitted feedback, newest first. Cached 2 min (Tier 2); use refresh to force fresh load.
 * @param {number} limitCount - max items (default 100)
 * @param {{ skipCache?: boolean }} [opts] - skipCache: true to bypass cache (e.g. Refresh button)
 * @returns {Promise<Array<{ id, userId, authorName, body, type, createdAt }>>}
 */
export const getFeedbackList = async (limitCount = 100, opts = {}) => {
  if (!opts.skipCache) {
    const cached = cacheGet(FEEDBACK_LIST_CACHE_KEY, FEEDBACK_CACHE_TTL_MS);
    if (cached != null) return cached;
  }
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  cacheSet(FEEDBACK_LIST_CACHE_KEY, list, FEEDBACK_CACHE_TTL_MS);
  return list;
};
